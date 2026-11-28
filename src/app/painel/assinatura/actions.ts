"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { appUrl, APP_NAME } from "@/lib/brand";
import { isValidTaxId } from "@/lib/format";
import { isPlanId, PLANS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { getPixProvider } from "@/lib/pix";
import { AsaasBillingError, cancelAsaasSubscription, startAsaasPix } from "@/lib/pix/asaas-billing";

export type BillingState = { error?: string | null } | undefined;

const DAY = 86_400_000;

// ---------- Cartão (Stripe) ----------

export async function startCardCheckout(_: BillingState, formData: FormData): Promise<BillingState> {
  const user = await requireUser();
  const business = user.business;
  const planId = formData.get("plan");
  if (!isPlanId(planId)) return { error: "Escolha um plano." };
  const plan = PLANS[planId];

  const stripe = getStripe();
  if (!stripe) return { error: "Pagamento com cartão ainda não está disponível. Tente o Pix ou fale com o suporte." };

  // Já tem assinatura no cartão ativa: gerencia pelo portal em vez de criar outra
  if (business.paymentMethod === "CARD" && business.stripeSubscriptionId && business.subscriptionStatus === "PAST_DUE") {
    return { error: "A última cobrança no seu cartão não passou. Use “Trocar cartão” para atualizar e a assinatura continua normalmente." };
  }
  if (business.paymentMethod === "CARD" && business.stripeSubscriptionId && business.subscriptionStatus === "ACTIVE") {
    return { error: "Você já tem uma assinatura no cartão. Use “Gerenciar cartão” para alterar ou cancelar." };
  }

  let customerId = business.stripeCustomerId;
  // O cliente pode não existir mais (ex.: criado no modo de teste e agora estamos no modo real)
  if (customerId) {
    const existing = await stripe.customers.retrieve(customerId).catch(() => null);
    if (!existing || existing.deleted) customerId = null;
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: business.name,
      email: user.email,
      metadata: { businessId: business.id },
    });
    customerId = customer.id;
    await db.business.update({ where: { id: business.id }, data: { stripeCustomerId: customerId } });
  }

  // Não cobra antes do fim do teste grátis ou do período já pago (ex.: quem pagou Pix e migrou para cartão)
  const paidUntil = Math.max(
    business.trialEndsAt.getTime(),
    business.currentPeriodEnd && business.subscriptionStatus === "ACTIVE" ? business.currentPeriodEnd.getTime() : 0,
  );
  const trialEnd = paidUntil > Date.now() + 2 * DAY ? Math.floor(paidUntil / 1000) : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: business.id,
    locale: "pt-BR",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: plan.priceCents,
          product_data: { name: `${APP_NAME} — Plano ${plan.name}` },
          recurring: { interval: "month", interval_count: plan.months },
        },
      },
    ],
    subscription_data: {
      metadata: { businessId: business.id, plan: plan.id },
      ...(trialEnd ? { trial_end: trialEnd } : {}),
    },
    metadata: { businessId: business.id, plan: plan.id },
    success_url: `${appUrl()}/painel/assinatura?sucesso=1`,
    cancel_url: `${appUrl()}/painel/assinatura`,
  });

  if (!session.url) return { error: "Não foi possível iniciar o pagamento. Tente novamente." };
  redirect(session.url);
}

/**
 * Abre o portal seguro da Stripe. `flow`: "card" (trocar cartão), "cancel" (cancelar) ou vazio (faturas e dados).
 * Se o atalho não estiver disponível na conta, abre o portal normal.
 */
export async function openCardPortal(formData?: FormData) {
  const user = await requireUser();
  const b = user.business;
  const stripe = getStripe();
  if (!stripe || !b.stripeCustomerId) redirect("/painel/assinatura");
  const flow = String(formData?.get("flow") ?? "");
  const base = { customer: b.stripeCustomerId, return_url: `${appUrl()}/painel/assinatura` };
  const flowData =
    flow === "card"
      ? { type: "payment_method_update" as const }
      : flow === "cancel" && b.stripeSubscriptionId
        ? { type: "subscription_cancel" as const, subscription_cancel: { subscription: b.stripeSubscriptionId } }
        : null;
  let url: string | null = null;
  if (flowData) {
    url = (await stripe.billingPortal.sessions.create({ ...base, flow_data: flowData }).catch(() => null))?.url ?? null;
  }
  if (!url) {
    url =
      (
        await stripe.billingPortal.sessions.create(base).catch((e) => {
          console.error("[stripe] erro ao abrir o portal", e);
          return null;
        })
      )?.url ?? null;
  }
  redirect(url ?? "/painel/assinatura?erro=portal");
}

// ---------- Pix ----------

export async function startPixPayment(_: BillingState, formData: FormData): Promise<BillingState> {
  const user = await requireUser();
  const business = user.business;
  const planId = formData.get("plan");
  if (!isPlanId(planId)) return { error: "Escolha um plano." };
  const plan = PLANS[planId];

  const taxId = String(formData.get("taxId") ?? "").replace(/\D/g, "");
  if (!isValidTaxId(taxId)) return { error: "Informe um CPF ou CNPJ válido." };

  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (phone.length < 10) return { error: "Informe um telefone com DDD." };

  const provider = getPixProvider();
  if (!provider) return { error: "Pagamento com Pix ainda não está disponível. Tente o cartão ou fale com o suporte." };

  if (business.taxId !== taxId || business.billingPhone !== phone) {
    await db.business.update({ where: { id: business.id }, data: { taxId, billingPhone: phone } });
  }

  // Asaas: assinatura Pix (a Asaas gera as cobranças de cada período)
  if (provider.name === "ASAAS") {
    let paymentId: string;
    try {
      paymentId = await startAsaasPix({ business, user, planId: plan.id, taxId, phone });
    } catch (e) {
      if (e instanceof AsaasBillingError) return { error: e.message };
      console.error("[asaas] erro ao iniciar Pix", e);
      return { error: "Não foi possível gerar o Pix agora. Tente novamente em alguns minutos." };
    }
    redirect(`/painel/assinatura/pix/${paymentId}`);
  }
  if (!provider.createCharge) return { error: "Pagamento com Pix indisponível." };

  // Reaproveita uma cobrança pendente do mesmo plano que ainda não expirou
  const pending = await db.payment.findFirst({
    where: { businessId: business.id, method: "PIX", plan: plan.id, status: "PENDING", expiresAt: { gt: new Date(Date.now() + 5 * 60_000) } },
    orderBy: { createdAt: "desc" },
  });
  if (pending) redirect(`/painel/assinatura/pix/${pending.id}`);

  const payment = await db.payment.create({
    data: { businessId: business.id, provider: provider.name, method: "PIX", plan: plan.id, amountCents: plan.priceCents },
  });

  try {
    const charge = await provider.createCharge({
      amountCents: plan.priceCents,
      description: `${APP_NAME} — Plano ${plan.name}`,
      reference: payment.id,
      customer: { name: business.name, email: user.email, taxId, phone },
      expiresInMinutes: 60,
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { externalId: charge.externalId, pixCopyPaste: charge.copyPaste, pixQrCode: charge.qrCode ?? null, expiresAt: charge.expiresAt },
    });
  } catch (e) {
    console.error("[pix] erro ao criar cobrança", e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { error: "Não foi possível gerar o Pix agora. Tente novamente em alguns minutos." };
  }

  redirect(`/painel/assinatura/pix/${payment.id}`);
}

/** Pix expirou: gera outro igual (mesmo plano, CPF/CNPJ e telefone já salvos). */
export async function renewPix(formData: FormData) {
  const user = await requireUser();
  const old = await db.payment.findFirst({ where: { id: String(formData.get("id") ?? ""), businessId: user.businessId, method: "PIX" } });
  const b = user.business;
  if (!old || !b.taxId || !(b.billingPhone ?? b.phone)) redirect("/painel/assinatura#planos");
  const fd = new FormData();
  fd.set("plan", old.plan);
  fd.set("taxId", b.taxId);
  fd.set("phone", b.billingPhone ?? b.phone ?? "");
  const r = await startPixPayment(undefined, fd); // redireciona para o Pix novo quando dá certo
  if (r?.error) redirect("/painel/assinatura?erro=pix");
}

export async function cancelPixSubscription() {
  const user = await requireUser();
  try {
    await cancelAsaasSubscription(user.business, true);
  } catch (e) {
    console.error("[asaas] erro ao cancelar assinatura", e);
    redirect("/painel/assinatura?erro=cancelar");
  }
  redirect("/painel/assinatura?cancelado=1");
}
