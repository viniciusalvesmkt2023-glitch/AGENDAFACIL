import "server-only";
import { db } from "./db";
import { blockAppliesOn } from "./schedule";
import { addDays, weekdayOf } from "./time";

/**
 * Dias bloqueados inteiros (folga, férias, feriado) na janela de agendamento.
 * Devolve uma função que lista os dias fechados de um profissional (bloqueios gerais valem para todos).
 */
export async function loadClosedDates(businessId: string, today: string, maxAdvanceDays: number) {
  const lastDay = addDays(today, maxAdvanceDays);
  const blocks = await db.timeBlock.findMany({
    where: { businessId, startMinutes: null, date: { lte: lastDay }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
  });
  const days = Array.from({ length: maxAdvanceDays + 1 }, (_, i) => addDays(today, i));
  return {
    blocks,
    closedDatesFor: (proId: string) =>
      days.filter((d) => blocks.some((b) => (b.professionalId === null || b.professionalId === proId) && blockAppliesOn(b, d, weekdayOf(d)))),
  };
}
