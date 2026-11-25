import "server-only";
import type { Business, User } from "@prisma/client";
import { db } from "../db";
import { APP_NAME } from "../brand";
import { isPlanId, PLAN_LIST, PLANS, type PlanId } from "../plans";
import { todayInTimezone } from "../time";
import { asaas, ASAAS_CYCLE, asaasProvider, mapAsaasStatus, type AsaasPayment } from "./asaas";
import { confirmPixPayment } from "./index";

export class AsaasBillingError extends Error {}

/** Garante a cobrança Pix em aberto do estabelecimento e devolve o id do nosso pagamento (para a tela do QR code). */
export async function startAsaasPix(opts: {
  business: Business;
  user: User;
  planId: PlanId;
  taxId: string;
  phone: string;
}): Promise<string> {
  const { user, planId, taxId, phone } = opts;
  let b = opts.business;
  const plan = PLANS[planId];

  // 1. Cliente na Asaas
  if (!b.asaasCustomerId) {
    const c = await asaas.createCustomer({ name: b.name, cpfCnpj: taxId, email: user.email, mobilePhone: phone, externalReference: b.id });
    b = await db.business.update({ where: { id: b.id }, data: { asaasCustomerId: c.id } });
  } else if (b.taxId !== taxId || b.billingPhone !== phone) {
    await asaas.updateCustomer(b.asaasCustomerId, { cpfCnpj: taxId, mobilePhone: phone, email: user.email });
  }

  // 2. Troca de plano: remove a assinatura antiga (as cobranças pendentes dela são removidas pela Asaas)
  if (b.asaasSubscriptionId && b.asaasPlan !== planId) {
    await asaas.deleteSubscription(b.asaasSubscriptionId);
    await db.payment.updateMany({ where: { businessId: b.id, provider: "ASAAS", status: "PENDING" }, data: { status: "EXPIRED" } });
    b = await db.business.update({ where: { id: b.id }, data: { asaasSubscriptionId: null, asaasPlan: null } });
  }

  // 3. Assinatura Pix (a Asaas gera as próximas cobranças sozinha)
  if (!b.asaasSubscriptionId) {
    // Quem ainda está no teste grátis só tem a 1ª cobrança vencendo no fim do teste (pode pagar antes)
    const today = todayInTimezone();
    const trialEnd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(b.trialEndsAt);
    const sub = await asaas.createSubscription({
      customer: b.asaasCustomerId!,
      value: plan.priceCents / 100,
      nextDueDate: trialEnd > today ? trialEnd : today,
      cycle: ASAAS_CYCLE[planId],
      description: `${APP_NAME} — Plano ${plan.name}`,
      externalReference: b.id,
    });
    b = await db.business.update({ where: { id: b.id }, data: { asaasSubscriptionId: sub.id, asaasPlan: planId } });
  }

  // 4. Cobrança em aberto mais antiga da assinatura
  const { data } = await asaas.subscriptionPayments(b.asaasSubscriptionId!, "PENDING");
  const open = [...(data ?? [])].sort((x, y) => (x.dueDate ?? "").localeCompare(y.dueDate ?? ""))[0]
    ?? (await asaas.subscriptionPayments(b.asaasSubscriptionId!, "OVERDUE")).data?.[0];
  if (!open) {
    throw new AsaasBillingError("Não há cobrança em aberto agora. A próxima será gerada automaticamente antes do vencimento.");
  }

  const payment = await upsertPayment(b, open);
  if (!payment.pixCopyPaste) await fillPixCode(payment.id, open.id);
  return payment.id;
}

/** Busca o QR code na Asaas e salva no pagamento. */
export async function fillPixCode(paymentId: string, externalId: string) {
  const code = await asaasProvider.getPixCode!(externalId);
  return db.payment.update({
    where: { id: paymentId },
    data: { pixCopyPaste: code.copyPaste, pixQrCode: code.qrCode, expiresAt: code.expiresAt },
  });
}

function planFor(b: Business, value: number): PlanId {
  const cents = Math.round(value * 100);
  const byValue = PLAN_LIST.find((p) => p.priceCents === cents)?.id;
  if (byValue) return byValue;
  if (isPlanId(b.asaasPlan)) return b.asaasPlan;
  return isPlanId(b.plan) ? b.plan : "MONTHLY";
}

async function upsertPayment(b: Business, p: AsaasPayment) {
  const existing = await db.payment.findUnique({ where: { externalId: p.id } });
  if (existing && existing.businessId !== b.id) {
    // Nunca associar uma cobrança a outro estabelecimento
    throw new Error(`[asaas] cobrança ${p.id} já pertence a outro estabelecimento`);
  }
  return db.payment.upsert({
    where: { externalId: p.id },
    update: {},
    create: {
      businessId: b.id,
      provider: "ASAAS",
      method: "PIX",
      plan: planFor(b, p.value),
      amountCents: Math.round(p.value * 100),
      status: "PENDING",
      externalId: p.id,
    },
  });
}

async function findBusiness(p: { subscription?: string | null; externalReference?: string | null; customer?: string | null }) {
  return (
    (p.subscription && (await db.business.findUnique({ where: { asaasSubscriptionId: p.subscription } }))) ||
    (p.externalReference && (await db.business.findUnique({ where: { id: p.externalReference } }))) ||
    (p.customer && (await db.business.findUnique({ where: { asaasCustomerId: p.customer } }))) ||
    null
  );
}

/** Processa um evento de webhook da Asaas. Idempotente (a Asaas pode reenviar o mesmo evento). */
export async function handleAsaasEvent(body: {
  event?: string;
  payment?: AsaasPayment;
  subscription?: { id: string; externalReference?: string | null; customer?: string | null };
}): Promise<string> {
  const { event, payment } = body;

  if ((event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVATED") && body.subscription) {
    const b = await db.business.findUnique({ where: { asaasSubscriptionId: body.subscription.id } });
    if (b) {
      await db.business.update({
        where: { id: b.id },
        data: {
          asaasSubscriptionId: null,
          asaasPlan: null,
          ...(b.paymentMethod === "PIX" ? { subscriptionStatus: "CANCELED" } : {}),
        },
      });
    }
    return "subscription-ended";
  }

  if (!payment?.id || !event?.startsWith("PAYMENT_")) return "ignored";
  if (payment.billingType && payment.billingType !== "PIX") return "ignored-not-pix";
  const b = await findBusiness(payment);
  if (!b) return "unknown-business";

  switch (event) {
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
    case "PAYMENT_OVERDUE":
      await upsertPayment(b, payment);
      return "pending";
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      if (mapAsaasStatus(payment.status) !== "PAID") return "ignored-status";
      await upsertPayment(b, payment);
      await confirmPixPayment(payment.id);
      return "paid";
    }
    case "PAYMENT_DELETED":
      await db.payment.updateMany({ where: { externalId: payment.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      return "deleted";
    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED": {
      const r = await db.payment.updateMany({ where: { externalId: payment.id, status: { not: "REFUNDED" } }, data: { status: "REFUNDED" } });
      if (r.count) console.warn(`[asaas] pagamento ${payment.id} (estabelecimento ${b.id}) estornado/contestado`);
      return "refunded";
    }
    default:
      return "ignored";
  }
}

/** Cancela a assinatura Pix (o acesso continua até o fim do período já pago). */
export async function cancelAsaasSubscription(b: Business, markCanceled: boolean) {
  if (b.asaasSubscriptionId) await asaas.deleteSubscription(b.asaasSubscriptionId);
  await db.payment.updateMany({ where: { businessId: b.id, provider: "ASAAS", status: "PENDING" }, data: { status: "EXPIRED" } });
  await db.business.update({
    where: { id: b.id },
    data: { asaasSubscriptionId: null, asaasPlan: null, ...(markCanceled ? { subscriptionStatus: "CANCELED" } : {}) },
  });
}
