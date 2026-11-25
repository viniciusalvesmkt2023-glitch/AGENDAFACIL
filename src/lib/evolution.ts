import "server-only";
import { normalizePhone } from "./format";

// Cliente da Evolution API (https://doc.evolution-api.com), versão 2.
// Cada estabelecimento tem uma "instância", que é o WhatsApp dele conectado por QR code.

export function evolutionConfigured(): boolean {
  return !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

export class EvolutionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !key) throw new EvolutionError("Evolution API não configurada");

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: { apikey: key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw new EvolutionError(`Servidor do WhatsApp indisponível: ${(e as Error).message}`);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data ? JSON.stringify((data as { response?: unknown }).response ?? data) : String(data);
    throw new EvolutionError(`Evolution ${res.status}: ${msg.slice(0, 300)}`, res.status);
  }
  return data as T;
}

const enc = encodeURIComponent;

export type ConnectionState = "open" | "connecting" | "close";

/** Cria a instância (se já existir, segue normalmente). */
export async function createInstance(name: string): Promise<void> {
  try {
    await call("POST", "/instance/create", { instanceName: name, qrcode: true, integration: "WHATSAPP-BAILEYS" });
  } catch (e) {
    // 403/409: nome já em uso — a instância já existe
    if (e instanceof EvolutionError && (e.status === 403 || e.status === 409)) return;
    throw e;
  }
}

/** Pede um QR code novo para conectar. Retorna a imagem (data URL) ou o texto do QR. */
export async function getQrCode(name: string): Promise<{ image: string | null; code: string | null; pairingCode: string | null }> {
  const data = await call<{ base64?: string; code?: string; pairingCode?: string; qrcode?: { base64?: string; code?: string } }>(
    "GET",
    `/instance/connect/${enc(name)}`,
  );
  const image = data.base64 ?? data.qrcode?.base64 ?? null;
  return {
    image: image ? (image.startsWith("data:") ? image : `data:image/png;base64,${image}`) : null,
    code: data.code ?? data.qrcode?.code ?? null,
    pairingCode: data.pairingCode ?? null,
  };
}

/**
 * Pede um código de pareamento (8 letras) para conectar pelo próprio celular,
 * sem precisar escanear QR code: WhatsApp → Aparelhos conectados → Conectar com número de telefone.
 */
export async function getPairingCode(name: string, phone: string): Promise<string | null> {
  const data = await call<{ pairingCode?: string | null }>("GET", `/instance/connect/${enc(name)}?number=${enc(normalizePhone(phone))}`);
  return data.pairingCode ?? null;
}

export async function getConnectionState(name: string): Promise<ConnectionState> {
  try {
    const data = await call<{ instance?: { state?: string }; state?: string }>("GET", `/instance/connectionState/${enc(name)}`);
    const state = data.instance?.state ?? data.state;
    return state === "open" ? "open" : state === "connecting" ? "connecting" : "close";
  } catch (e) {
    if (e instanceof EvolutionError && e.status === 404) return "close";
    throw e;
  }
}

/** Número conectado na instância (somente dígitos), se disponível. */
export async function getConnectedNumber(name: string): Promise<string | null> {
  const data = await call<unknown>("GET", `/instance/fetchInstances?instanceName=${enc(name)}`).catch(() => null);
  const list = Array.isArray(data) ? data : data ? [data] : [];
  const item = list[0] as { ownerJid?: string; number?: string; instance?: { owner?: string } } | undefined;
  const raw = item?.ownerJid ?? item?.instance?.owner ?? item?.number ?? null;
  return raw ? raw.split("@")[0].replace(/\D/g, "") || null : null;
}

export async function logoutInstance(name: string): Promise<void> {
  await call("DELETE", `/instance/logout/${enc(name)}`).catch(() => undefined);
}

export async function deleteInstance(name: string): Promise<void> {
  await call("DELETE", `/instance/delete/${enc(name)}`).catch(() => undefined);
}

export type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string; disconnected: boolean };

export async function sendText(instance: string, to: string, text: string): Promise<SendResult> {
  try {
    const data = await call<{ key?: { id?: string } }>("POST", `/message/sendText/${enc(instance)}`, {
      number: normalizePhone(to),
      text,
    });
    return { ok: true, messageId: data?.key?.id ?? null };
  } catch (e) {
    const error = (e as Error).message;
    // Instância desconectada ou inexistente
    const disconnected = e instanceof EvolutionError && (e.status === 404 || /not connected|connection closed|close/i.test(error));
    return { ok: false, error, disconnected };
  }
}
