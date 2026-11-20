import "server-only";
import { db } from "./db";
import { appUrl } from "./brand";
import { hasAccess } from "./subscription";
import { addDays, formatDateLong, minutesToTime, todayInTimezone } from "./time";
import { whenText, type ReminderType } from "./reminders";
import { sendWhatsAppTemplate, TEMPLATES, whatsappConfigured } from "./whatsapp";

type MessageType = "CONFIRMATION" | ReminderType;

const SENT_FIELD = {
  CONFIRMATION: "confirmationSentAt",
  REMINDER_24H: "reminder24hSentAt",
  REMINDER_2H: "reminder2hSentAt",
} as const;

/**
 * Envia a mensagem de WhatsApp de um agendamento.
 * "Reserva" o envio marcando o campo antes, para nunca mandar a mesma mensagem duas vezes.
 */
export async function sendAppointmentMessage(appointmentId: string, type: MessageType): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (!whatsappConfigured()) return "SKIPPED";
  const field = SENT_FIELD[type];

  const claimed = await db.appointment.updateMany({
    where: { id: appointmentId, [field]: null, status: { in: ["SCHEDULED", "CONFIRMED"] } },
    data: { [field]: new Date() },
  });
  if (claimed.count === 0) return "SKIPPED";

  const a = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { business: true, client: true, service: true, professional: true },
  });
  if (!a.business.whatsappRemindersEnabled || !hasAccess(a.business)) return "SKIPPED";

  const today = todayInTimezone();
  const time = minutesToTime(a.startMinutes);
  const when = whenText(a.date, time, today, addDays(today, 1), formatDateLong(a.date));
  const link = `${appUrl()}/agendamento/${a.cancelToken}`;
  const firstName = a.client.name.split(" ")[0];

  const template = type === "CONFIRMATION" ? TEMPLATES.confirmation() : TEMPLATES.reminder();
  // Ordem dos parâmetros = {{1}}..{{6}} dos templates cadastrados na Meta (veja o README)
  const params = [firstName, a.business.name, when, a.service.name, a.professional.name, link];
  const result = await sendWhatsAppTemplate(a.client.phone, template, params);

  await db.messageLog.create({
    data: {
      businessId: a.businessId,
      appointmentId: a.id,
      type,
      to: a.client.phone,
      status: result.ok ? "SENT" : "FAILED",
      providerMessageId: result.ok ? result.messageId : null,
      error: result.ok ? null : result.error.slice(0, 500),
    },
  });
  if (!result.ok) console.warn(`[whatsapp] falha ao enviar ${type} (${a.id}): ${result.error}`);
  return result.ok ? "SENT" : "FAILED";
}
