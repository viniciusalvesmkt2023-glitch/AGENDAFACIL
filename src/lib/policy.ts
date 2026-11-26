// Regras do que o cliente pode fazer pelo link do agendamento (cancelar e remarcar).
import { diffDays } from "./time";

export const CANCEL_POLICIES = ["FREE", "DEADLINE", "NEVER"] as const;
export type CancelPolicy = (typeof CANCEL_POLICIES)[number];
export const DEADLINE_OPTIONS = [60, 120, 180, 240, 360, 720, 1440, 2880];

type Rules = { clientCancelPolicy: string; cancelDeadlineMinutes: number };
type Appt = { date: string; startMinutes: number; status: string };
type Now = { date: string; minutes: number };

export type ChangeCheck = { allowed: true } | { allowed: false; reason: string };

/** Minutos que faltam até o horário (negativo se já passou). */
export function minutesUntil(appt: Appt, now: Now): number {
  return diffDays(now.date, appt.date) * 24 * 60 + appt.startMinutes - now.minutes;
}

/** O cliente pode cancelar ou remarcar pelo link agora? */
export function clientCanChange(rules: Rules, appt: Appt, now: Now): ChangeCheck {
  if (appt.status !== "SCHEDULED" && appt.status !== "CONFIRMED") return { allowed: false, reason: "Este agendamento já foi encerrado." };
  const left = minutesUntil(appt, now);
  if (left <= 0) return { allowed: false, reason: "O horário deste agendamento já passou." };
  if (rules.clientCancelPolicy === "NEVER") {
    return { allowed: false, reason: "Para cancelar ou trocar o horário, fale com o estabelecimento." };
  }
  if (rules.clientCancelPolicy === "DEADLINE" && left < rules.cancelDeadlineMinutes) {
    return {
      allowed: false,
      reason: `Cancelamentos e trocas pelo link só até ${deadlineLabel(rules.cancelDeadlineMinutes)} antes do horário. Fale com o estabelecimento.`,
    };
  }
  return { allowed: true };
}

/** Texto curto da regra, ex.: "até 2 horas antes". */
export function deadlineLabel(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 dia" : `${minutes / 1440} dias`;
  if (minutes % 60 === 0) return minutes === 60 ? "1 hora" : `${minutes / 60} horas`;
  return `${minutes} minutos`;
}
