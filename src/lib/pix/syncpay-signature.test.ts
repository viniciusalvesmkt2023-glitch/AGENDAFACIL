import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapSyncPayStatus, verifySyncPaySignature } from "./syncpay-signature";

const secret = "segredo_teste";
const body = '{"event":"transaction.updated","transaction":{"reference_id":"abc","status":"completed"}}';
const sign = (t: number, b = body, s = secret) => `t=${t},v1=${createHmac("sha256", s).update(`${t}.${b}`).digest("hex")}`;

describe("verifySyncPaySignature", () => {
  const now = 1_800_000_000;
  it("aceita assinatura válida", () => {
    expect(verifySyncPaySignature(sign(now), body, secret, now)).toBe(true);
    expect(verifySyncPaySignature(sign(now - 200), body, secret, now)).toBe(true);
  });
  it("rejeita corpo alterado, segredo errado e formato inválido", () => {
    expect(verifySyncPaySignature(sign(now), body.replace("completed", "pending"), secret, now)).toBe(false);
    expect(verifySyncPaySignature(sign(now, body, "outro"), body, secret, now)).toBe(false);
    expect(verifySyncPaySignature("lixo", body, secret, now)).toBe(false);
    expect(verifySyncPaySignature(null, body, secret, now)).toBe(false);
    expect(verifySyncPaySignature(sign(now), body, "", now)).toBe(false);
  });
  it("rejeita entregas com mais de 5 minutos (replay)", () => {
    expect(verifySyncPaySignature(sign(now - 301), body, secret, now)).toBe(false);
    expect(verifySyncPaySignature(sign(now + 301), body, secret, now)).toBe(false);
  });
});

describe("mapSyncPayStatus", () => {
  it("só completed libera", () => {
    expect(mapSyncPayStatus("completed")).toBe("PAID");
    expect(mapSyncPayStatus("pending")).toBe("PENDING");
    expect(mapSyncPayStatus("med")).toBe("PENDING");
    expect(mapSyncPayStatus("failed")).toBe("FAILED");
    expect(mapSyncPayStatus("refused")).toBe("FAILED");
    expect(mapSyncPayStatus("refunded")).toBe("REFUNDED");
    expect(mapSyncPayStatus("chargeback")).toBe("REFUNDED");
    expect(mapSyncPayStatus(undefined)).toBe("PENDING");
  });
});
