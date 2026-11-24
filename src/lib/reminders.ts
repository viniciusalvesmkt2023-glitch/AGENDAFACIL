// Regras de quando enviar cada lembrete (funções puras, testadas).
//
// - Confirmação: na hora do agendamento (não passa por aqui).
// - Lembrete 24h: ~24h antes, só se o cliente agendou com mais de 26h de antecedência
//   (quem agenda para o mesmo dia ou para o dia seguinte em cima da hora já recebeu a confirmação).
// - Lembrete 1h: ~1h antes, só se o cliente agendou com mais de 2h de antecedência.
// O cron roda a cada 15 minutos, então cada lembrete sai entre 0 e 15 minutos depois do momento exato.

const HOUR = 3_600_000;

export type ReminderType = "REMINDER_24H" | "REMINDER_1H";

export const SHORT_REMINDER_HOURS = 1;
const SHORT_REMINDER_MIN_ADVANCE_HOURS = 2;
const DAY_REMINDER_MIN_ADVANCE_HOURS = 26;

export function dueReminder(
  a: { start: Date; createdAt: Date; reminder24hSentAt: Date | null; reminder1hSentAt: Date | null },
  now: Date,
): ReminderType | null {
  const untilStart = a.start.getTime() - now.getTime();
  if (untilStart <= 0) return null;
  const bookedAhead = a.start.getTime() - a.createdAt.getTime();

  // Lembrete de 1h
  if (!a.reminder1hSentAt && untilStart <= SHORT_REMINDER_HOURS * HOUR) {
    return bookedAhead > SHORT_REMINDER_MIN_ADVANCE_HOURS * HOUR ? "REMINDER_1H" : null;
  }
  // Lembrete de 24h
  if (
    !a.reminder24hSentAt &&
    !a.reminder1hSentAt &&
    untilStart <= 24 * HOUR &&
    bookedAhead > DAY_REMINDER_MIN_ADVANCE_HOURS * HOUR
  ) {
    return "REMINDER_24H";
  }
  return null;
}

/** "hoje às 14:00", "amanhã às 09:30" ou "sexta-feira, 27 de novembro às 10:00" */
export function whenText(date: string, time: string, today: string, tomorrow: string, longDate: string): string {
  if (date === today) return `hoje às ${time}`;
  if (date === tomorrow) return `amanhã às ${time}`;
  return `${longDate} às ${time}`;
}
