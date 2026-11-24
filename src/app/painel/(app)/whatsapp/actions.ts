"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { createInstance, deleteInstance, evolutionConfigured, logoutInstance, sendText } from "@/lib/evolution";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, MAX_MESSAGE_LENGTH, renderMessage } from "@/lib/messages";
import { appUrl } from "@/lib/brand";
import { DAY_MODES, SHORT_OPTIONS, type DayMode } from "@/lib/reminders";
import { timeToMinutes } from "@/lib/time";

export type WhatsappState = { error?: string | null; success?: string | null } | undefined;

function instanceName(businessId: string) {
  return `ag_${businessId}`;
}

export async function startWhatsappConnection(): Promise<WhatsappState> {
  const user = await requireActiveUser();
  if (!evolutionConfigured()) return { error: "O servidor de WhatsApp ainda não foi configurado." };
  const name = user.business.whatsappInstance ?? instanceName(user.businessId);
  try {
    await createInstance(name);
  } catch (e) {
    console.error("[whatsapp] erro ao criar instância", e);
    return { error: "Não foi possível falar com o servidor de WhatsApp. Tente novamente em instantes." };
  }
  await db.business.update({
    where: { id: user.businessId },
    data: { whatsappInstance: name, whatsappStatus: "CONNECTING" },
  });
  revalidatePath("/painel/whatsapp");
  return { success: null };
}

export async function disconnectWhatsapp() {
  const user = await requireActiveUser();
  const name = user.business.whatsappInstance;
  if (name) {
    await logoutInstance(name);
    await deleteInstance(name);
  }
  await db.business.update({
    where: { id: user.businessId },
    data: { whatsappInstance: null, whatsappStatus: "DISCONNECTED", whatsappNumber: null, whatsappConnectedAt: null },
  });
  revalidatePath("/painel", "layout");
}

export async function saveWhatsappSettings(_: WhatsappState, formData: FormData): Promise<WhatsappState> {
  const user = await requireActiveUser();
  // Navegadores enviam quebras de linha como \r\n; normalizamos para \n
  const clean = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\r\n?/g, "\n").trim();
  const confirmation = clean(formData.get("msgConfirmation"));
  const reminder = clean(formData.get("msgReminder"));
  if (confirmation.length > MAX_MESSAGE_LENGTH || reminder.length > MAX_MESSAGE_LENGTH) {
    return { error: `Cada mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.` };
  }
  const dayMode = String(formData.get("reminderDayMode") ?? "24H") as DayMode;
  const shortMinutes = Number(formData.get("reminderShortMinutes"));
  const dayTime = timeToMinutes(String(formData.get("reminderDayTime") ?? "18:00"));
  if (!DAY_MODES.includes(dayMode)) return { error: "Opção de lembrete antecipado inválida." };
  if (!(SHORT_OPTIONS as readonly number[]).includes(shortMinutes)) return { error: "Opção de lembrete inválida." };
  if (dayMode === "EVENING" && !(Number.isFinite(dayTime) && dayTime >= 6 * 60 && dayTime <= 22 * 60)) {
    return { error: "Escolha um horário entre 06:00 e 22:00 para o lembrete da véspera." };
  }

  await db.business.update({
    where: { id: user.businessId },
    data: {
      whatsappRemindersEnabled: formData.get("whatsappRemindersEnabled") === "on",
      confirmationEnabled: formData.get("confirmationEnabled") === "on",
      reminderDayMode: dayMode,
      ...(dayMode === "EVENING" ? { reminderDayTime: dayTime } : {}),
      reminderShortMinutes: shortMinutes,
      // Vazio ou igual ao padrão = usa o texto padrão (e recebe melhorias futuras)
      msgConfirmation: confirmation && confirmation !== DEFAULT_CONFIRMATION ? confirmation : null,
      msgReminder: reminder && reminder !== DEFAULT_REMINDER ? reminder : null,
    },
  });
  revalidatePath("/painel/whatsapp");
  return { success: "Configurações de WhatsApp salvas." };
}

export async function sendTestMessage(_: WhatsappState, formData: FormData): Promise<WhatsappState> {
  const user = await requireActiveUser();
  const b = user.business;
  if (!b.whatsappInstance || b.whatsappStatus !== "CONNECTED") return { error: "Conecte o WhatsApp primeiro." };
  const to = String(formData.get("to") ?? "").replace(/\D/g, "");
  if (to.length < 10) return { error: "Informe um número com DDD." };

  const text = renderMessage(b.msgReminder || DEFAULT_REMINDER, {
    nome: user.name.split(" ")[0],
    estabelecimento: b.name,
    quando: "amanhã às 14:00",
    servico: "Serviço de exemplo",
    profissional: user.name.split(" ")[0],
    link: `${appUrl()}/${b.slug}`,
  });
  const result = await sendText(b.whatsappInstance, to, `🧪 Mensagem de teste\n\n${text}`);
  if (!result.ok) {
    if (result.disconnected) {
      await db.business.update({ where: { id: b.id }, data: { whatsappStatus: "DISCONNECTED" } });
      revalidatePath("/painel/whatsapp");
    }
    return { error: "Não foi possível enviar. Verifique se o WhatsApp continua conectado." };
  }
  return { success: "Mensagem de teste enviada! Confira no WhatsApp." };
}
