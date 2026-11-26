// Textos dos bloqueios de agenda (para listas e para a agenda do dia).
import { formatDateShort, minutesToTime } from "./time";

type Block = { kind: string; date: string; endDate: string | null; weekday: number | null; startMinutes: number | null; endMinutes: number | null };

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function blockTime(b: Pick<Block, "startMinutes" | "endMinutes">): string {
  return b.startMinutes === null || b.endMinutes === null ? "dia inteiro" : `${minutesToTime(b.startMinutes)} às ${minutesToTime(b.endMinutes)}`;
}

/** Ex.: "Toda terça, 14:00 às 15:00" ou "12/12 a 20/12, dia inteiro". */
export function blockWhen(b: Block): string {
  if (b.kind === "WEEKLY") {
    const wd = b.weekday ?? 0;
    const until = b.endDate ? ` (até ${formatDateShort(b.endDate)})` : "";
    return `${wd === 0 || wd === 6 ? "Todo" : "Toda"} ${DAY_NAMES[wd]}, ${blockTime(b)}${until}`;
  }
  const range = b.endDate && b.endDate !== b.date ? `${formatDateShort(b.date)} a ${formatDateShort(b.endDate)}` : formatDateShort(b.date);
  return `${range}, ${blockTime(b)}`;
}
