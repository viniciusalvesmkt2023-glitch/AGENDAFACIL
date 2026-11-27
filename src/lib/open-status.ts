// "Aberto agora · até 19h" / "Fechado agora · abre amanhã às 9h" (pelo horário do estabelecimento).
// O intervalo de almoço não entra aqui: ele só tira horários da agenda; para o cliente o
// estabelecimento aparece aberto da hora que abre até a hora que fecha.
import { minutesToTime } from "./time";

type Hour = { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number; breakStart: number | null; breakEnd: number | null };

const DAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** 540 → "9h", 1110 → "18h30" */
const hm = (m: number) => {
  const [h, min] = minutesToTime(m).split(":");
  return `${Number(h)}h${min === "00" ? "" : min}`;
};

export function openStatus(hours: Hour[], now: { weekday: number; minutes: number }, closedToday = false): { open: boolean; text: string } {
  const today = hours.find((h) => h.weekday === now.weekday);
  if (today?.isOpen && !closedToday) {
    const m = now.minutes;
    if (m >= today.startMinutes && m < today.endMinutes) return { open: true, text: `até ${hm(today.endMinutes)}` };
    if (m < today.startMinutes) return { open: false, text: `abre hoje às ${hm(today.startMinutes)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const wd = (now.weekday + i) % 7;
    const h = hours.find((x) => x.weekday === wd);
    if (h?.isOpen) return { open: false, text: `abre ${i === 1 ? "amanhã" : DAY[wd]} às ${hm(h.startMinutes)}` };
  }
  return { open: false, text: "sem horários definidos" };
}
