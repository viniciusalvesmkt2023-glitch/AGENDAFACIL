"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { appUrl, APP_NAME } from "@/lib/brand";
import { isValidTaxId } from "@/lib/format";
import { isPlanId, PLANS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { getPixProvider } from "@/lib/pix";

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

export async function openCardPortal() {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe || !user.business.stripeCustomerId) redirect("/painel/assinatura");
  const portal = await stripe.billingPortal.sessions
    .create({ customer: user.business.stripeCustomerId, return_url: `${appUrl()}/painel/assinatura` })
    .catch((e) => {
      console.error("[stripe] erro ao abrir o portal", e);
      return null;
    });
  redirect(portal?.url ?? "/painel/assinatura?erro=portal");
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

  const provider = getPixProvider();
  if (!provider) return { error: "Pagamento com Pix ainda não está disponível. Tente o cartão ou fale com o suporte." };

  if (business.taxId !== taxId) {
    await db.business.update({ where: { id: business.id }, data: { taxId } });
  }

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
      customer: { name: business.name, email: user.email, taxId, phone: business.phone },
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
