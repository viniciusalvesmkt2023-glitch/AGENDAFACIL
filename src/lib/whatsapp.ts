import "server-only";
import { normalizePhone } from "./format";

// Envio de mensagens pela API oficial do WhatsApp (Meta Cloud API).
// Mensagens iniciadas pela empresa precisam usar templates aprovados pela Meta.

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export const TEMPLATES = {
  confirmation: () => process.env.WHATSAPP_TEMPLATE_CONFIRMATION || "agendamento_confirmado",
  reminder: () => process.env.WHATSAPP_TEMPLATE_REMINDER || "lembrete_agendamento",
};

export type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

export async function sendWhatsAppTemplate(to: string, template: string, params: string[]): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, error: "WhatsApp não configurado" };

  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const base = process.env.WHATSAPP_API_BASE || "https://graph.facebook.com";
  const res = await fetch(`${base}/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "template",
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR" },
        components: [
          {
            type: "body",
            // A Meta não aceita parâmetros vazios nem com quebras de linha
            parameters: params.map((text) => ({ type: "text", text: text.replace(/\s+/g, " ").trim() || "-" })),
          },
        ],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e: Error) => e);

  if (res instanceof Error) return { ok: false, error: res.message };
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
  if (!res.ok) return { ok: false, error: `${res.status} ${data.error?.code ?? ""} ${data.error?.message ?? ""}`.trim() };
  return { ok: true, messageId: data.messages?.[0]?.id ?? null };
}
