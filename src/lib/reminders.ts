// Regras de quando enviar cada lembrete (funções puras, testadas).
// Cada estabelecimento configura:
//  - lembrete antecipado: desligado, 24h antes, ou na véspera em um horário fixo (ex.: 18:00)
//  - lembrete curto: desligado ou X minutos antes (30, 60, 120...)
// O cron roda a cada 15 minutos, então cada lembrete sai entre 0 e 15 minutos após o momento programado.

import { addDays, localToUtc, TIMEZONE } from "./time";

const MIN = 60_000;
const HOUR = 60 * MIN;

export type ReminderType = "REMINDER_DAY" | "REMINDER_SHORT";
export type DayMode = "OFF" | "24H" | "EVENING";

export type ReminderConfig = { dayMode: string; dayTime: number; shortMinutes: number };

export const SHORT_OPTIONS = [0, 30, 60, 120, 180, 240] as const;
export const DAY_MODES: DayMode[] = ["OFF", "24H", "EVENING"];

/** Antecedência mínima entre o agendamento e o lembrete (senão ele repetiria a confirmação). */
const DAY_MIN_GAP = 2 * HOUR;
const SHORT_MIN_GAP = 1 * HOUR;
/** Se o lembrete antecipado atrasar mais que isso (ex.: configuração mudada tarde da noite), é descartado
 *  para não mandar mensagem de madrugada — o lembrete curto ainda cobre o cliente. */
const DAY_MAX_DELAY = 3 * HOUR;

/** Momentos programados para os lembretes de um agendamento. */
export function reminderSchedule(
  appt: { date: string; startMinutes: number },
  cfg: ReminderConfig,
  tz: string = TIMEZONE,
): { start: Date; dayAt: Date | null; shortAt: Date | null } {
  const start = localToUtc(appt.date, appt.startMinutes, tz);
  const shortAt = cfg.shortMinutes > 0 ? new Date(start.getTime() - cfg.shortMinutes * MIN) : null;
  let dayAt: Date | null = null;
  if (cfg.dayMode === "24H") dayAt = new Date(start.getTime() - 24 * HOUR);
  else if (cfg.dayMode === "EVENING") dayAt = localToUtc(addDays(appt.date, -1), cfg.dayTime, tz);
  // O antecipado precisa vir antes do curto
  if (dayAt && shortAt && dayAt >= shortAt) dayAt = null;
  return { start, dayAt, shortAt };
}

export function dueReminder(
  a: { createdAt: Date; reminderDaySentAt: Date | null; reminderShortSentAt: Date | null },
  sched: { start: Date; dayAt: Date | null; shortAt: Date | null },
  now: Date,
): ReminderType | null {
  const t = now.getTime();
  if (t >= sched.start.getTime()) return null;
  const created = a.createdAt.getTime();

  if (sched.shortAt && !a.reminderShortSentAt && t >= sched.shortAt.getTime()) {
    return created < sched.shortAt.getTime() - SHORT_MIN_GAP ? "REMINDER_SHORT" : null;
  }
  if (
    sched.dayAt &&
    !a.reminderDaySentAt &&
    !a.reminderShortSentAt &&
    t >= sched.dayAt.getTime() &&
    t <= sched.dayAt.getTime() + DAY_MAX_DELAY &&
    created < sched.dayAt.getTime() - DAY_MIN_GAP
  ) {
    return "REMINDER_DAY";
  }
  return null;
}

/** "hoje às 14:00", "amanhã às 09:30" ou "sexta-feira, 27 de novembro às 10:00" */
export function whenText(date: string, time: string, today: string, tomorrow: string, longDate: string): string {
  if (date === today) return `hoje às ${time}`;
  if (date === tomorrow) return `amanhã às ${time}`;
  return `${longDate} às ${time}`;
}

/** Texto curto para o painel: "1 hora antes", "30 minutos antes"... */
export function shortLabel(minutes: number): string {
  if (minutes <= 0) return "Desligado";
  if (minutes < 60) return `${minutes} minutos antes`;
  const h = minutes / 60;
  return `${h} hora${h > 1 ? "s" : ""} antes`;
}
