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

// ---------- Explicações para o cliente ----------

type Interval = { startMinutes: number; endMinutes: number };

/** Junta períodos que se encostam ou se sobrepõem. */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].filter((i) => i.endMinutes > i.startMinutes).sort((a, b) => a.startMinutes - b.startMinutes);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && i.startMinutes <= last.endMinutes) last.endMinutes = Math.max(last.endMinutes, i.endMinutes);
    else out.push({ ...i });
  }
  return out;
}

/** Períodos em comum entre duas listas (onde as duas estão fechadas). */
function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a)
    for (const y of b) {
      const s = Math.max(x.startMinutes, y.startMinutes);
      const e = Math.min(x.endMinutes, y.endMinutes);
      if (e > s) out.push({ startMinutes: s, endMinutes: e });
    }
  return mergeIntervals(out);
}

type ProDayInfo = { hours: DayHours | null; blocks: Interval[] };

/** O profissional atende em algum momento do dia? (fechado ou bloqueado o dia todo = não) */
export function worksThatDay(p: ProDayInfo): boolean {
  if (!p.hours?.isOpen) return false;
  return !p.blocks.some((b) => b.startMinutes <= p.hours!.startMinutes && b.endMinutes >= p.hours!.endMinutes);
}

/** Pausas e bloqueios dentro do horário de atendimento (ex.: almoço, 11h às 13h). */
function closedWithinDay(p: ProDayInfo): Interval[] {
  const h = p.hours!;
  const list: Interval[] = [...p.blocks];
  if (h.breakStart != null && h.breakEnd != null) list.push({ startMinutes: h.breakStart, endMinutes: h.breakEnd });
  return mergeIntervals(
    list.map((i) => ({ startMinutes: Math.max(i.startMinutes, h.startMinutes), endMinutes: Math.min(i.endMinutes, h.endMinutes) })),
  );
}

/** Períodos fechados que valem para todos os profissionais considerados (para avisar o cliente). */
export function closedPeriods(pros: ProDayInfo[]): Interval[] {
  const open = pros.filter(worksThatDay);
  if (!open.length) return [];
  return open.map(closedWithinDay).reduce((acc, cur) => intersect(acc, cur));
}

export type EmptyReason = "CLOSED" | "PAST" | "FULL";

/** Por que um dia não tem horários: fechado, horários já passaram, ou lotado. */
export function emptyDayReason(pros: ProDayInfo[], earliestStart: number, durationMinutes: number): EmptyReason {
  const open = pros.filter(worksThatDay);
  if (!open.length) return "CLOSED";
  if (open.every((p) => earliestStart + durationMinutes > p.hours!.endMinutes)) return "PAST";
  return "FULL";
}
