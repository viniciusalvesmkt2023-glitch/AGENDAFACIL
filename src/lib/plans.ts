// Planos de assinatura. Para mudar preços, altere aqui.
export type PlanId = "MONTHLY" | "SEMIANNUAL" | "ANNUAL";

export type Plan = {
  id: PlanId;
  name: string;
  months: number;
  priceCents: number; // valor total cobrado no período
  highlight?: string;
};

export const TRIAL_DAYS = 7;

export const PLANS: Record<PlanId, Plan> = {
  MONTHLY: { id: "MONTHLY", name: "Mensal", months: 1, priceCents: 3790 },
  SEMIANNUAL: { id: "SEMIANNUAL", name: "Semestral", months: 6, priceCents: 19740, highlight: "Economize 13%" },
  ANNUAL: { id: "ANNUAL", name: "Anual", months: 12, priceCents: 33480, highlight: "Melhor preço · economize 26%" },
};

export const PLAN_LIST = [PLANS.MONTHLY, PLANS.SEMIANNUAL, PLANS.ANNUAL];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

/** Valor equivalente por mês, em centavos. */
export function monthlyEquivalentCents(plan: Plan): number {
  return Math.round(plan.priceCents / plan.months);
}

/** Desconto em % em relação a pagar o plano mensal pelo mesmo período. */
export function discountPercent(plan: Plan): number {
  const full = PLANS.MONTHLY.priceCents * plan.months;
  return Math.round((1 - plan.priceCents / full) * 100);
}
