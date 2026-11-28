import "server-only";
import { db } from "../db";
import { extendPeriod } from "../subscription";
import { isPlanId, PLANS } from "../plans";
import { mockPixProvider } from "./mock";
import { syncPayProvider } from "./syncpay";
import { asaasConfigured, asaasProvider } from "./asaas";
import type { PixProvider } from "./types";

export type { PixProvider } from "./types";

/** Provedor Pix configurado, ou null se o Pix não estiver disponível. */
export function getPixProvider(): PixProvider | null {
  const name = process.env.PIX_PROVIDER?.toLowerCase();
  // O provedor de teste nunca roda na Vercel (só no computador local)
  if (name === "mock" && !process.env.VERCEL && process.env.NODE_ENV !== "production") return mockPixProvider;
  if (asaasConfigured()) return asaasProvider;
  if (process.env.SYNCPAY_CLIENT_ID && process.env.SYNCPAY_CLIENT_SECRET && process.env.SYNCPAY_WEBHOOK_SECRET) {
    return syncPayProvider;
  }
  return null;
}

/**
 * Marca um pagamento Pix como pago e estende a assinatura.
 * Idempotente: chamadas repetidas (webhook duplicado) não estendem duas vezes.
 */
export async function confirmPixPayment(externalId: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { externalId } });
    if (!payment || payment.status === "PAID" || payment.status === "REFUNDED") return payment;

    const marked = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "EXPIRED", "FAILED"] } },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (marked.count === 0) return payment;

    const business = await tx.business.findUniqueOrThrow({ where: { id: payment.businessId } });
    const plan = isPlanId(payment.plan) ? PLANS[payment.plan] : PLANS.MONTHLY;
    await tx.business.update({
      where: { id: business.id },
      data: {
        subscriptionStatus: "ACTIVE",
        paymentMethod: "PIX",
        plan: plan.id,
        // Soma a partir do fim do período atual ou do fim do teste grátis (quem paga durante o teste não perde dias)
        currentPeriodEnd: extendPeriod(laterOf(business.currentPeriodEnd, business.trialEndsAt), plan.months),
      },
    });
    return { ...payment, status: "PAID" };
  });
}

function laterOf(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
