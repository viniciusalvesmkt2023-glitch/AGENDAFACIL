// Cliente da API da Asaas (https://docs.asaas.com).
// - Autenticação pelo header "access_token" (chave de API); "User-Agent" obrigatório.
// - Sandbox: chaves com "_hmlg_" usam https://api-sandbox.asaas.com automaticamente.
import type { PlanId } from "../plans";
import type { PixProvider, PixStatus } from "./types";

export function asaasConfigured(): boolean {
  return !!(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN);
}

function baseUrl(): string {
  if (process.env.ASAAS_API_BASE) return process.env.ASAAS_API_BASE.replace(/\/$/, "");
  return process.env.ASAAS_API_KEY?.includes("_hmlg_") ? "https://api-sandbox.asaas.com" : "https://api.asaas.com";
}

export class AsaasError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}/v3${path}`, {
    method,
    headers: {
      access_token: process.env.ASAAS_API_KEY ?? "",
      "User-Agent": "HoraBoa",
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
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
    const errors = (data as { errors?: { code?: string; description?: string }[] })?.errors;
    const msg = errors?.map((e) => e.description || e.code).join("; ") || String(text).slice(0, 300);
    throw new AsaasError(`Asaas ${res.status}: ${msg}`, res.status);
  }
  return data as T;
}

export const ASAAS_CYCLE: Record<PlanId, string> = {
  MONTHLY: "MONTHLY",
  SEMIANNUAL: "SEMIANNUALLY",
  ANNUAL: "YEARLY",
};

/** Status da cobrança na Asaas -> nosso status. Só pagamento efetivado libera o acesso. */
export function mapAsaasStatus(status: string | undefined): PixStatus {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return "PAID";
    case "REFUNDED":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "AWAITING_CHARGEBACK_REVERSAL":
      return "REFUNDED";
    default:
      return "PENDING"; // PENDING, OVERDUE, REFUND_REQUESTED, REFUND_IN_PROGRESS...
  }
}

/** "2026-12-24 23:59:59" (horário de Brasília) -> Date */
export function parseAsaasDateTime(value: string | undefined | null): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}${iso.length <= 10 ? "T23:59:59" : ""}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type AsaasPayment = {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  externalReference?: string | null;
  value: number;
  status: string;
  dueDate?: string;
  billingType?: string;
  deleted?: boolean;
};

export const asaas = {
  createCustomer: (c: { name: string; cpfCnpj: string; email: string; mobilePhone: string; externalReference: string }) =>
    call<{ id: string }>("POST", "/customers", { ...c, notificationDisabled: false }),

  updateCustomer: (id: string, c: { cpfCnpj: string; mobilePhone: string; email: string }) =>
    call<{ id: string }>("POST", `/customers/${encodeURIComponent(id)}`, c),

  createSubscription: (s: {
    customer: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    description: string;
    externalReference: string;
  }) =>
    call<{ id: string }>("POST", "/subscriptions", {
      ...s,
      billingType: "PIX",
      // Oferece o Pix Automático no pagamento da cobrança (o cliente escolhe se autoriza)
      pixAutomaticAuthorizationMode: "OPTIONAL",
    }),

  async deleteSubscription(id: string): Promise<void> {
    try {
      await call("DELETE", `/subscriptions/${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof AsaasError && e.status === 404) return;
      throw e;
    }
  },

  subscriptionPayments: (id: string, status?: string) =>
    call<{ data: AsaasPayment[] }>("GET", `/subscriptions/${encodeURIComponent(id)}/payments${status ? `?status=${status}` : ""}`),

  getPayment: (id: string) => call<AsaasPayment>("GET", `/payments/${encodeURIComponent(id)}`),

  pixQrCode: (paymentId: string) =>
    call<{ encodedImage: string; payload: string; expirationDate: string }>("GET", `/payments/${encodeURIComponent(paymentId)}/pixQrCode`),
};

/** Provedor usado pela tela do Pix e pela consulta de contingência. */
export const asaasProvider: PixProvider = {
  name: "ASAAS",
  async getStatus(externalId) {
    const p = await asaas.getPayment(externalId);
    return p.deleted ? "EXPIRED" : mapAsaasStatus(p.status);
  },
  async getPixCode(externalId) {
    const qr = await asaas.pixQrCode(externalId);
    return {
      copyPaste: qr.payload,
      qrCode: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
      expiresAt: parseAsaasDateTime(qr.expirationDate) ?? new Date(Date.now() + 24 * 3_600_000),
    };
  },
};
