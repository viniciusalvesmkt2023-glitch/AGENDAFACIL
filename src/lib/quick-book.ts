// Agendamento rápido: monta os horários (vários serviços seguidos e repetição semanal) e o pagamento.

/** Formas de pagamento para escolher. ("CARD" = registros antigos, antes de separar débito e crédito.) */
export const PAYMENT_METHODS = { PIX: "Pix", CASH: "Dinheiro", DEBIT: "Débito", CREDIT: "Crédito" } as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const isPaymentMethod = (v: unknown): v is PaymentMethod => typeof v === "string" && v in PAYMENT_METHODS;

/** Nome da forma de pagamento (inclusive a antiga "Cartão"). */
export function methodLabel(m: string | null | undefined): string {
  if (!m) return "";
  if (m === "CARD") return "Cartão";
  return isPaymentMethod(m) ? PAYMENT_METHODS[m] : m;
}

export type Slot = { date: string; start: number; end: number; item: number };

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Os serviços ficam um depois do outro, a partir do horário escolhido.
 * Repetir: a mesma sequência a cada `everyWeeks` semanas, `times` vezes no total.
 */
export function planSlots(date: string, start: number, durations: number[], repeat?: { everyWeeks: number; times: number }): Slot[] {
  const times = repeat ? Math.max(1, Math.min(52, repeat.times)) : 1;
  const every = repeat ? Math.max(1, Math.min(8, repeat.everyWeeks)) : 1;
  const out: Slot[] = [];
  for (let k = 0; k < times; k++) {
    const d = addDays(date, k * every * 7);
    let t = start;
    durations.forEach((dur, item) => {
      out.push({ date: d, start: t, end: t + dur, item });
      t += dur;
    });
  }
  return out;
}

/** Quantos horários batem com algo já marcado (encaixe). */
export function countConflicts(slots: Slot[], busy: { date: string; start: number; end: number }[]): number {
  return slots.filter((s) => busy.some((b) => b.date === s.date && s.start < b.end && b.start < s.end)).length;
}
