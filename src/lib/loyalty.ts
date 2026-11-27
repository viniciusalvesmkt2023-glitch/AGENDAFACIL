// Cartão fidelidade: regras puras (texto do prêmio, desconto, validade dos selos). Testáveis.

export const REWARD_TYPES = { FREE_SERVICE: "Serviço grátis", PERCENT: "% de desconto", AMOUNT: "R$ de desconto" } as const;
export type RewardType = keyof typeof REWARD_TYPES;
export const isRewardType = (v: unknown): v is RewardType => typeof v === "string" && v in REWARD_TYPES;

const money = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;

/** "Corte grátis", "20% de desconto", "R$ 15 de desconto". */
export function rewardLabel(type: string, value: number, serviceName?: string | null): string {
  if (type === "PERCENT") return `${(value / 100).toLocaleString("pt-BR")}% de desconto`;
  if (type === "AMOUNT") return `${money(value)} de desconto`;
  return `${serviceName ? serviceName.toLowerCase() : "serviço"} grátis`;
}

/**
 * Valor do atendimento depois de usar o prêmio.
 * Serviço grátis: zera se for o mesmo serviço; se for outro, desconta até o valor do serviço do prêmio (rewardValue).
 */
export function priceAfterReward(priceCents: number, reward: { rewardType: string; rewardValue: number; rewardServiceId: string | null }, serviceId: string): number {
  if (reward.rewardType === "PERCENT") return Math.max(0, Math.round(priceCents * (1 - reward.rewardValue / 10000)));
  if (reward.rewardType === "AMOUNT") return Math.max(0, priceCents - reward.rewardValue);
  if (reward.rewardServiceId === serviceId) return 0;
  return Math.max(0, priceCents - reward.rewardValue);
}

/** Data mínima ("YYYY-MM-DD") para um selo ainda valer (null = não vence). */
export function stampCutoff(today: string, months: number | null | undefined): string | null {
  if (!months) return null;
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - months, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, last));
  return dt.toISOString().slice(0, 10);
}

/** O atendimento dá selo? (concluído, ou pago e já aconteceu; não cancelado/falta; não pago com prêmio; serviço participa) */
export function earnsStamp(
  a: { status: string; paymentStatus: string; date: string; serviceId: string; loyaltyRewardId: string | null },
  cfg: { loyaltyEnabled: boolean; loyaltyServiceIds: string[]; startDate: string | null },
  today: string,
): boolean {
  if (!cfg.loyaltyEnabled || !cfg.startDate) return false;
  if (a.status === "CANCELED" || a.status === "NO_SHOW") return false;
  if (a.loyaltyRewardId) return false;
  if (a.date < cfg.startDate) return false;
  if (cfg.loyaltyServiceIds.length && !cfg.loyaltyServiceIds.includes(a.serviceId)) return false;
  return a.status === "COMPLETED" || (a.paymentStatus === "PAID" && a.date <= today);
}

/** O selo que existe precisa sair? (cancelou, faltou, reabriu sem pagar, ou usou prêmio) */
export function losesStamp(a: { status: string; paymentStatus: string; date: string; loyaltyRewardId: string | null }, today: string): boolean {
  if (a.status === "CANCELED" || a.status === "NO_SHOW" || a.loyaltyRewardId) return true;
  return !(a.status === "COMPLETED" || (a.paymentStatus === "PAID" && a.date <= today));
}
