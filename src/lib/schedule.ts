// Regras de agenda por profissional: horário próprio e bloqueios. Funções puras (testáveis).
import type { BusyInterval, DayHours } from "./availability";

export type HourRow = DayHours & { weekday: number };

export type BlockRow = {
  kind: string; // ONCE | WEEKLY
  date: string;
  endDate: string | null;
  weekday: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  professionalId: string | null;
};

export const FULL_DAY: BusyInterval = { startMinutes: 0, endMinutes: 24 * 60 };

/** O bloqueio vale nesta data? */
export function blockAppliesOn(b: BlockRow, date: string, weekday: number): boolean {
  if (b.kind === "WEEKLY") {
    return b.weekday === weekday && date >= b.date && (!b.endDate || date <= b.endDate);
  }
  return date >= b.date && date <= (b.endDate ?? b.date);
}

/** Períodos bloqueados de um profissional numa data (bloqueios gerais valem para todos). */
export function blockIntervals(blocks: BlockRow[], date: string, weekday: number, professionalId: string): BusyInterval[] {
  return blocks
    .filter((b) => (b.professionalId === null || b.professionalId === professionalId) && blockAppliesOn(b, date, weekday))
    .map((b) => (b.startMinutes === null || b.endMinutes === null ? FULL_DAY : { startMinutes: b.startMinutes, endMinutes: b.endMinutes }));
}

/** Horário do profissional no dia: o próprio (se tiver) ou o do estabelecimento. */
export function effectiveHours(
  pro: { customHours: boolean; hours: HourRow[] },
  businessHours: HourRow[],
  weekday: number,
): DayHours | null {
  const list = pro.customHours ? pro.hours : businessHours;
  return list.find((h) => h.weekday === weekday) ?? null;
}

/** Dias da semana em que o profissional atende. */
export function openWeekdays(pro: { customHours: boolean; hours: HourRow[] }, businessHours: HourRow[]): number[] {
  return (pro.customHours ? pro.hours : businessHours).filter((h) => h.isOpen).map((h) => h.weekday);
}
