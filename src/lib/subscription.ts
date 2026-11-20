// Regras de acesso da assinatura (funções puras, testadas).

/** Dias de tolerância após o vencimento antes de bloquear (ex.: atraso de compensação do pagamento). */
export const GRACE_DAYS = 3;
const DAY = 86_400_000;

export type SubscriptionInfo = {
  subscriptionStatus: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
};

export type AccessState =
  | { kind: "trial"; daysLeft: number }
  | { kind: "active"; renewsAt: Date | null }
  | { kind: "grace"; daysLeft: number }
  | { kind: "blocked"; reason: "trial_ended" | "expired" | "canceled" };

export function getAccessState(b: SubscriptionInfo, now: Date = new Date()): AccessState {
  const t = now.getTime();

  if (b.currentPeriodEnd && b.subscriptionStatus !== "TRIALING") {
    const end = b.currentPeriodEnd.getTime();
    if (end > t) return { kind: "active", renewsAt: b.currentPeriodEnd };
    if (end + GRACE_DAYS * DAY > t && b.subscriptionStatus !== "CANCELED") {
      return { kind: "grace", daysLeft: Math.ceil((end + GRACE_DAYS * DAY - t) / DAY) };
    }
  }

  // Ainda dentro do teste grátis (também vale se cancelou durante o teste)
  if (b.trialEndsAt.getTime() > t) {
    return { kind: "trial", daysLeft: Math.ceil((b.trialEndsAt.getTime() - t) / DAY) };
  }

  if (b.subscriptionStatus === "CANCELED") return { kind: "blocked", reason: "canceled" };
  return { kind: "blocked", reason: b.currentPeriodEnd ? "expired" : "trial_ended" };
}

export function hasAccess(b: SubscriptionInfo, now: Date = new Date()): boolean {
  return getAccessState(b, now).kind !== "blocked";
}

/** Nova data de vencimento ao pagar um período (Pix): soma a partir do vencimento atual se ainda não venceu. */
export function extendPeriod(currentEnd: Date | null, months: number, now: Date = new Date()): Date {
  const base = currentEnd && currentEnd > now ? new Date(currentEnd) : new Date(now);
  const day = base.getUTCDate();
  base.setUTCMonth(base.getUTCMonth() + months);
  // Evita pular mês (ex.: 31/jan + 1 mês = 3/mar) — volta para o último dia do mês correto
  if (base.getUTCDate() < day) base.setUTCDate(0);
  return base;
}
