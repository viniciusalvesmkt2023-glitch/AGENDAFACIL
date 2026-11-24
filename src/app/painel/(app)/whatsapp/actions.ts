"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { createInstance, deleteInstance, evolutionConfigured, logoutInstance, sendText } from "@/lib/evolution";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, MAX_MESSAGE_LENGTH, renderMessage } from "@/lib/messages";
import { appUrl } from "@/lib/brand";

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
  await db.business.update({
    where: { id: user.businessId },
    data: {
      whatsappRemindersEnabled: formData.get("whatsappRemindersEnabled") === "on",
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
