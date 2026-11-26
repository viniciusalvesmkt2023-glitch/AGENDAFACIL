import { minutesToTime, WEEKDAYS } from "@/lib/time";

type Row = { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number; breakStart: number | null; breakEnd: number | null };

/** Dias para o formulário de horários, de segunda a domingo. */
export function weekForForm(rows: Row[]) {
  const byDay = new Map(rows.map((h) => [h.weekday, h]));
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const h = byDay.get(weekday);
    return {
      weekday,
      label: WEEKDAYS[weekday],
      isOpen: h?.isOpen ?? false,
      start: minutesToTime(h?.startMinutes ?? 540),
      end: minutesToTime(h?.endMinutes ?? 1080),
      breakStart: h?.breakStart != null ? minutesToTime(h.breakStart) : "",
      breakEnd: h?.breakEnd != null ? minutesToTime(h.breakEnd) : "",
    };
  });
}
