import "server-only";
import { APP_NAME } from "./brand";

// Envio de e-mails pela Resend (https://resend.com).
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Sem chave (desenvolvimento): mostra o e-mail no terminal
    console.info(`[email] RESEND_API_KEY ausente — e-mail não enviado.\nPara: ${msg.to}\nAssunto: ${msg.subject}\n${msg.text}`);
    return false;
  }
  const from = process.env.EMAIL_FROM || `${APP_NAME} <nao-responda@horaboa.com>`;
  const base = process.env.RESEND_API_BASE || "https://api.resend.com";
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error(`[email] falha ${res.status}: ${await res.text().catch(() => "")}`);
    return res.ok;
  } catch (e) {
    console.error("[email] erro ao enviar", e);
    return false;
  }
}
