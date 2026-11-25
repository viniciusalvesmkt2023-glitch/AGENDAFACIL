// Integração Pix com a SyncPay (https://docs.syncpayments.com.br).
// - Autenticação: client_id + client_secret -> token Bearer válido por 1 hora (reaproveitado).
// - Cobrança: POST /cash-in (valores em reais) -> pix_code (copia e cola) + identifier.
// - Confirmação: webhook do evento "transaction" com assinatura HMAC (X-SyncPay-Signature).
// - Consulta de status: só como contingência (a SyncPay permite no máximo 5 por cobrança).
import type { PixProvider } from "./types";
import { mapSyncPayStatus, verifySyncPaySignature } from "./syncpay-signature";

const base = () => (process.env.SYNCPAY_API_BASE || "https://api.syncpayments.com.br").replace(/\/$/, "") + "/api/partner/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${await getToken()}`;
  const res = await fetch(base() + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    // Token recusado: descarta para gerar outro na próxima chamada
    if (res.status === 401 && auth) cachedToken = null;
    const msg = typeof data === "object" && data ? JSON.stringify(data) : String(data);
    throw new Error(`SyncPay ${res.status}: ${msg.slice(0, 300)}`);
  }
  return data as T;
}

async function getToken(): Promise<string> {
  // Reaproveita o token até 5 minutos antes de expirar
  if (cachedToken && cachedToken.expiresAt - 5 * 60_000 > Date.now()) return cachedToken.value;
  const data = await call<{ access_token: string; expires_in?: number }>(
    "POST",
    "/auth-token",
    { client_id: process.env.SYNCPAY_CLIENT_ID, client_secret: process.env.SYNCPAY_CLIENT_SECRET },
    false,
  );
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export const syncPayProvider: PixProvider = {
  name: "SYNCPAY",

  async createCharge(input) {
    const data = await call<{ pix_code: string; identifier: string }>("POST", "/cash-in", {
      amount: Number((input.amountCents / 100).toFixed(2)),
      description: input.description,
      client: {
        name: input.customer.name,
        document: input.customer.taxId,
        email: input.customer.email,
        phone: input.customer.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""),
      },
    });
    if (!data?.pix_code || !data?.identifier) throw new Error("SyncPay: resposta sem pix_code/identifier");
    return {
      externalId: data.identifier,
      copyPaste: data.pix_code,
      // A SyncPay não informa a validade; usamos 24h para exibição (o webhook avisa se falhar)
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    };
  },

  async getStatus(externalId) {
    const data = await call<{ data?: { status?: string } }>("GET", `/transaction/${encodeURIComponent(externalId)}`);
    return mapSyncPayStatus(data?.data?.status);
  },

  async parseWebhook(rawBody, headers) {
    const secret = process.env.SYNCPAY_WEBHOOK_SECRET ?? "";
    if (!verifySyncPaySignature(headers.get("x-syncpay-signature"), rawBody, secret)) return null;
    const body = JSON.parse(rawBody) as {
      event?: string;
      transaction?: { reference_id?: string; status?: string; payment_method?: string };
    };
    const t = body.transaction;
    if (!t?.reference_id || (t.payment_method && t.payment_method !== "pix")) return null;
    return { externalId: t.reference_id, status: mapSyncPayStatus(t.status) };
  },
};
