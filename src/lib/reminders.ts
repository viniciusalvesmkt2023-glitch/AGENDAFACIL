// Regras de quando enviar cada lembrete (funções puras, testadas).

const HOUR = 3_600_000;

export type ReminderType = "REMINDER_24H" | "REMINDER_2H";

export function dueReminder(
  a: { start: Date; createdAt: Date; reminder24hSentAt: Date | null; reminder2hSentAt: Date | null },
  now: Date,
): ReminderType | null {
  const untilStart = a.start.getTime() - now.getTime();
  if (untilStart <= 0) return null;
  const bookedAhead = a.start.getTime() - a.createdAt.getTime();

  // Lembrete de 2h (só se o agendamento foi feito com mais de 3h de antecedência)
  if (!a.reminder2hSentAt && untilStart <= 2 * HOUR) {
    return bookedAhead > 3 * HOUR ? "REMINDER_2H" : null;
  }
  // Lembrete de 24h (só se agendou com mais de 26h de antecedência; quem agendou em cima da hora já recebeu a confirmação)
  if (!a.reminder24hSentAt && !a.reminder2hSentAt && untilStart <= 24 * HOUR && bookedAhead > 26 * HOUR) {
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
