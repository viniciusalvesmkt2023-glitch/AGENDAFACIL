import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import { isPlanId } from "./plans";
import { cancelAsaasSubscription } from "./pix/asaas-billing";

let client: Stripe | null = null;

/** Cliente da Stripe, ou null se STRIPE_SECRET_KEY não estiver configurada. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

const STATUS_MAP: Record<string, string> = {
  active: "ACTIVE",
  trialing: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  paused: "PAST_DUE",
  canceled: "CANCELED",
  incomplete_expired: "CANCELED",
};

/** Data de fim do período atual (nas versões novas da API ela fica nos itens da assinatura). */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  // Formato antigo da API (antes de 2025-03): a data ficava na própria assinatura
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof legacy === "number") ends.push(legacy);
  const end = Math.max(...ends, sub.trial_end ?? 0);
  return end > 0 ? new Date(end * 1000) : null;
}

/** Atualiza o estabelecimento a partir de uma assinatura da Stripe. */
export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const business =
    (sub.metadata?.businessId && (await db.business.findUnique({ where: { id: sub.metadata.businessId } }))) ||
    (await db.business.findFirst({ where: { OR: [{ stripeSubscriptionId: sub.id }, { stripeCustomerId: customerId }] } }));
  if (!business) {
    console.warn(`[stripe] assinatura ${sub.id} sem estabelecimento correspondente`);
    return;
  }

  // Ignora eventos de uma assinatura antiga quando o estabelecimento já tem outra
  if (business.stripeSubscriptionId && business.stripeSubscriptionId !== sub.id && STATUS_MAP[sub.status] === "CANCELED") return;

  const status = STATUS_MAP[sub.status];
  const plan = sub.metadata?.plan;
  await db.business.update({
    where: { id: business.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      ...(status ? { subscriptionStatus: status } : {}),
      ...(status && status !== "CANCELED" ? { paymentMethod: "CARD" } : {}),
      // só avança a validade quando a cobrança deu certo (cartão recusado fica na tolerância a partir do vencimento antigo)
      ...(status === "ACTIVE" ? { currentPeriodEnd: periodEnd(sub) } : {}),
      ...(isPlanId(plan) ? { plan } : {}),
    },
  });

  // Mudou para cartão: encerra a assinatura Pix da Asaas para não cobrar em dobro
  if (status === "ACTIVE" && business.asaasSubscriptionId) {
    await cancelAsaasSubscription(business, false).catch((e) => console.error("[asaas] erro ao cancelar ao migrar para cartão", e));
  }
}

/** Registra uma fatura paga no histórico de pagamentos. */
export async function recordStripeInvoice(invoice: Stripe.Invoice, sub: Stripe.Subscription | null) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const business =
    (sub?.metadata?.businessId && (await db.business.findUnique({ where: { id: sub.metadata.businessId } }))) ||
    (customerId ? await db.business.findFirst({ where: { stripeCustomerId: customerId } }) : null);
  if (!business || !invoice.id || invoice.amount_paid <= 0) return;

  const plan = isPlanId(sub?.metadata?.plan) ? sub!.metadata.plan : business.plan ?? "MONTHLY";
  await db.payment.upsert({
    where: { externalId: invoice.id },
    update: { status: "PAID", paidAt: new Date() },
    create: {
      businessId: business.id,
      provider: "STRIPE",
      method: "CARD",
      plan,
      amountCents: invoice.amount_paid,
      status: "PAID",
      externalId: invoice.id,
      paidAt: new Date(),
    },
  });
}

/** Erro da Stripe de "não existe" (ex.: cliente/assinatura criados no modo de teste e agora estamos no modo real). */
function isMissing(e: unknown): boolean {
  const err = e as { code?: string; statusCode?: number };
  return err?.code === "resource_missing" || err?.statusCode === 404;
}

/**
 * Confere se a assinatura de cartão salva ainda existe na conta da Stripe em uso.
 * Se não existir (troca do modo de teste para o real), limpa os dados para o estabelecimento poder assinar de novo.
 * Erros de rede não apagam nada.
 */
export async function ensureStripeSubscriptionExists(business: {
  id: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date;
}): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe || !business.stripeSubscriptionId) return true;
  try {
    await stripe.subscriptions.retrieve(business.stripeSubscriptionId);
    return true;
  } catch (e) {
    if (!isMissing(e)) return true;
    console.warn(`[stripe] assinatura ${business.stripeSubscriptionId} não existe nesta conta; limpando dados`);
    await db.business.update({
      where: { id: business.id },
      data: {
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        paymentMethod: null,
        plan: null,
        currentPeriodEnd: null,
        subscriptionStatus: business.trialEndsAt > new Date() ? "TRIALING" : "CANCELED",
      },
    });
    return false;
  }
}

/** Bandeira e final do cartão da assinatura (ou null se não der para buscar agora). Nunca espera mais de 3s. */
export async function cardOnFile(subscriptionId: string | null): Promise<{ brand: string; last4: string } | null> {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return null;
  const lookup = async () => {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method", "customer.invoice_settings.default_payment_method"] });
    const fromCustomer =
      typeof sub.customer === "object" && !("deleted" in sub.customer && sub.customer.deleted)
        ? (sub.customer as Stripe.Customer).invoice_settings?.default_payment_method
        : null;
    const pm = (typeof sub.default_payment_method === "object" && sub.default_payment_method) || (typeof fromCustomer === "object" && fromCustomer) || null;
    const card = pm && "card" in pm ? pm.card : null;
    return card ? { brand: card.brand, last4: card.last4 } : null;
  };
  try {
    return await Promise.race([lookup(), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
  } catch {
    return null;
  }
}
