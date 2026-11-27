// Horário de trabalho do profissional: períodos que se combinam (manhã/tarde/noite) e o resumo da semana.

export type PeriodId = "manha" | "tarde" | "noite";

/** Períodos prontos, em minutos desde 00:00. */
export const PERIODS: { id: PeriodId; label: string; emoji: string; start: number; end: number }[] = [
  { id: "manha", label: "Manhã", emoji: "☀️", start: 8 * 60, end: 12 * 60 },
  { id: "tarde", label: "Tarde", emoji: "🌇", start: 13 * 60, end: 18 * 60 },
  { id: "noite", label: "Noite", emoji: "🌙", start: 18 * 60, end: 22 * 60 },
];

export type DaySpan = { start: number; end: number; breakStart: number | null; breakEnd: number | null };

/**
 * Junta os períodos marcados num horário do dia. O espaço entre dois períodos separados vira o intervalo
 * (ex.: manhã + tarde = 08–18 com intervalo 12–13; tarde + noite = 13–22 direto).
 */
export function combinePeriods(ids: Iterable<PeriodId>): DaySpan | null {
  const set = new Set(ids);
  const ps = PERIODS.filter((p) => set.has(p.id));
  if (!ps.length) return null;
  const span: DaySpan = { start: ps[0].start, end: ps[ps.length - 1].end, breakStart: null, breakEnd: null };
  // Só existe um intervalo por dia: usa o primeiro buraco, ou a tarde inteira em manhã + noite
  const first = ps.findIndex((p, i) => i > 0 && p.start > ps[i - 1].end);
  if (first > 0) {
    span.breakStart = ps[first - 1].end;
    span.breakEnd = ps[first].start;
  }
  return span;
}

const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type Row = { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number };

/** "Seg a Sex · 13:00 – 18:00", "Seg, Qua · horários variados" ou "Sem dias de atendimento". */
export function summarizeWeek(rows: Row[]): string {
  // ordem da semana começando na segunda
  const order = [1, 2, 3, 4, 5, 6, 0];
  const open = order.map((wd) => rows.find((r) => r.weekday === wd && r.isOpen)).filter((r): r is Row => !!r);
  if (!open.length) return "Sem dias de atendimento";
  const idx = open.map((r) => order.indexOf(r.weekday));
  const inSequence = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const days = inSequence && open.length > 2 ? `${SHORT[open[0].weekday]} a ${SHORT[open[open.length - 1].weekday]}` : open.map((r) => SHORT[r.weekday]).join(", ");
  const same = open.every((r) => r.startMinutes === open[0].startMinutes && r.endMinutes === open[0].endMinutes);
  return same ? `${days} · ${hm(open[0].startMinutes)} – ${hm(open[0].endMinutes)}` : `${days} · horários variados`;
}
