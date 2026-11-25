import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida o cabeçalho X-SyncPay-Signature ("t=<unix>,v1=<hex>").
 * A string assinada é "{t}.{corpo bruto}" com HMAC-SHA256 e o segredo do webhook.
 * Rejeita entregas fora de uma janela de 5 minutos (proteção contra replay).
 */
export function verifySyncPaySignature(
  header: string | null,
  rawBody: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;
  if (Math.abs(nowSeconds - t) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Converte o status da SyncPay para o nosso. Só "completed" libera o acesso. */
export function mapSyncPayStatus(status: string | undefined): "PAID" | "FAILED" | "PENDING" | "REFUNDED" {
  switch (status) {
    case "completed":
      return "PAID";
    case "failed":
    case "refused":
    case "three_ds_failed":
      return "FAILED";
    case "refunded":
    case "chargeback":
      return "REFUNDED";
    default:
      // pending, refunding, med e desconhecidos: aguarda
      return "PENDING";
  }
}
