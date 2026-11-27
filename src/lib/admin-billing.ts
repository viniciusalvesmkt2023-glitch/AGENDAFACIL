// Regras das ações de assinatura do painel admin (funções puras, testadas).
import { extendPeriod, type SubscriptionInfo } from "./subscription";

const DAY = 86_400_000;

/**
 * Estender o acesso por N dias:
 * - quem está (ou estava) no teste grátis sem nunca ter assinado ganha mais dias de teste;
 * - quem já assinou (ativo, atrasado, vencido ou cancelado) ganha dias no período pago e volta a ficar ativo.
 * Sempre conta a partir de hoje se a data já passou.
 */
export function extendAccessData(
  b: SubscriptionInfo,
  days: number,
  now: Date = new Date(),
): { kind: "trial"; until: Date; data: { trialEndsAt: Date } } | { kind: "paid"; until: Date; data: { subscriptionStatus: string; currentPeriodEnd: Date } } {
  const add = (from: Date | null) => new Date(Math.max(from?.getTime() ?? 0, now.getTime()) + days * DAY);
  if (b.subscriptionStatus === "TRIALING" && !b.currentPeriodEnd) {
    const until = add(b.trialEndsAt);
    return { kind: "trial", until, data: { trialEndsAt: until } };
  }
  const until = add(b.currentPeriodEnd);
  return { kind: "paid", until, data: { subscriptionStatus: "ACTIVE", currentPeriodEnd: until } };
}

/** Ativar um plano manualmente (pagou por fora): soma os meses do plano ao período atual. */
export function grantPlanData(b: SubscriptionInfo, plan: string, months: number, now: Date = new Date()) {
  return { subscriptionStatus: "ACTIVE", plan, currentPeriodEnd: extendPeriod(b.currentPeriodEnd, months, now) };
}

/** Cancelar o acesso (ex.: reembolso): corta na hora, inclusive o teste grátis. */
export function cancelAccessData(b: SubscriptionInfo, now: Date = new Date()) {
  return {
    subscriptionStatus: "CANCELED",
    currentPeriodEnd: now,
    trialEndsAt: b.trialEndsAt < now ? b.trialEndsAt : now,
  };
}
