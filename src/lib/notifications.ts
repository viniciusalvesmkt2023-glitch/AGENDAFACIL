import "server-only";
import { db } from "./db";
import { appUrl } from "./brand";
import { hasAccess } from "./subscription";
import { addDays, formatDateLong, minutesToTime, todayInTimezone } from "./time";
import { whenText, type ReminderType } from "./reminders";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, renderMessage } from "./messages";
import { evolutionConfigured, sendText } from "./evolution";

type MessageType = "CONFIRMATION" | ReminderType;

const SENT_FIELD = {
  CONFIRMATION: "confirmationSentAt",
  REMINDER_DAY: "reminderDaySentAt",
  REMINDER_SHORT: "reminderShortSentAt",
} as const;

/**
 * Envia a mensagem de WhatsApp de um agendamento pelo WhatsApp do próprio estabelecimento.
 * "Reserva" o envio marcando o campo antes, para nunca mandar a mesma mensagem duas vezes.
 */
export async function sendAppointmentMessage(appointmentId: string, type: MessageType): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (!evolutionConfigured()) return "SKIPPED";
  const field = SENT_FIELD[type];

  // Só reserva o envio se o estabelecimento estiver com o WhatsApp conectado e as mensagens ligadas
  const claimed = await db.appointment.updateMany({
    where: {
      id: appointmentId,
      [field]: null,
      // "A confirmar" não recebe confirmação nem lembrete (só depois que o dono aprovar)
      status: "CONFIRMED",
      business: {
        whatsappRemindersEnabled: true,
        whatsappStatus: "CONNECTED",
        whatsappInstance: { not: null },
        // A confirmação também pode ser desligada pelo estabelecimento
        ...(type === "CONFIRMATION" ? { confirmationEnabled: true } : {}),
      },
    },
    data: { [field]: new Date() },
  });
  if (claimed.count === 0) return "SKIPPED";

  const a = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { business: true, client: true, service: true, professional: true },
  });
  if (!hasAccess(a.business) || !a.business.whatsappInstance) return "SKIPPED";

  const today = todayInTimezone();
  const time = minutesToTime(a.startMinutes);
  const template =
    type === "CONFIRMATION"
      ? a.business.msgConfirmation || DEFAULT_CONFIRMATION
      : a.business.msgReminder || DEFAULT_REMINDER;
  const text = renderMessage(template, {
    nome: a.client.name.split(" ")[0],
    estabelecimento: a.business.name,
    quando: whenText(a.date, time, today, addDays(today, 1), formatDateLong(a.date)),
    servico: a.service.name,
    profissional: a.professional.name,
    link: `${appUrl()}/agendamento/${a.cancelToken}`,
  });

  const result = await sendText(a.business.whatsappInstance, a.client.phone, text);

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

  if (!result.ok) {
    console.warn(`[whatsapp] falha ao enviar ${type} (${a.id}): ${result.error}`);
    // Marca como desconectado para o painel avisar o dono
    if (result.disconnected) {
      await db.business.update({ where: { id: a.businessId }, data: { whatsappStatus: "DISCONNECTED" } });
    }
  }
  return result.ok ? "SENT" : "FAILED";
}

/**
 * Mensagem avulsa para o cliente pelo WhatsApp do estabelecimento (recusa de horário, cartão fidelidade).
 * Só envia se o WhatsApp estiver conectado e as mensagens ligadas.
 */
export async function sendClientText(input: { businessId: string; appointmentId?: string | null; phone: string; type: string; text: string }): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (!evolutionConfigured()) return "SKIPPED";
  const b = await db.business.findUnique({ where: { id: input.businessId } });
  if (!b || !b.whatsappRemindersEnabled || b.whatsappStatus !== "CONNECTED" || !b.whatsappInstance || !hasAccess(b)) return "SKIPPED";
  const result = await sendText(b.whatsappInstance, input.phone, input.text);
  await db.messageLog.create({
    data: {
      businessId: b.id,
      appointmentId: input.appointmentId ?? null,
      type: input.type,
      to: input.phone,
      status: result.ok ? "SENT" : "FAILED",
      providerMessageId: result.ok ? result.messageId : null,
      error: result.ok ? null : result.error.slice(0, 500),
    },
  });
  if (!result.ok && result.disconnected) await db.business.update({ where: { id: b.id }, data: { whatsappStatus: "DISCONNECTED" } });
  return result.ok ? "SENT" : "FAILED";
}

/** Dono recusou um horário que estava "A confirmar": avisa o cliente com o link para marcar outro. */
export async function sendDeclinedMessage(appointmentId: string) {
  const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { business: true, client: true, service: true } });
  if (!a) return "SKIPPED";
  const today = todayInTimezone();
  const quando = whenText(a.date, minutesToTime(a.startMinutes), today, addDays(today, 1), formatDateLong(a.date));
  const text =
    `Olá, ${a.client.name.split(" ")[0]}! Infelizmente não conseguimos confirmar seu horário de ${a.service.name} em *${a.business.name}* ${quando}. 😕\n` +
    `Escolha outro horário por aqui: ${appUrl()}/${a.business.slug}`;
  return sendClientText({ businessId: a.businessId, appointmentId: a.id, phone: a.client.phone, type: "DECLINED", text });
}
