import { describe, expect, it } from "vitest";
import { mapAsaasStatus, parseAsaasDateTime } from "./asaas";

describe("asaas", () => {
  it("mapeia status: só pagamento efetivado libera", () => {
    expect(mapAsaasStatus("RECEIVED")).toBe("PAID");
    expect(mapAsaasStatus("CONFIRMED")).toBe("PAID");
    expect(mapAsaasStatus("PENDING")).toBe("PENDING");
    expect(mapAsaasStatus("OVERDUE")).toBe("PENDING");
    expect(mapAsaasStatus("REFUND_REQUESTED")).toBe("PENDING");
    expect(mapAsaasStatus("REFUNDED")).toBe("REFUNDED");
    expect(mapAsaasStatus("CHARGEBACK_REQUESTED")).toBe("REFUNDED");
  });
  it("converte datas da Asaas (horário de Brasília)", () => {
    expect(parseAsaasDateTime("2026-12-24 23:59:59")!.toISOString()).toBe("2026-12-25T02:59:59.000Z");
    expect(parseAsaasDateTime("2026-12-24")!.toISOString()).toBe("2026-12-25T02:59:59.000Z");
    expect(parseAsaasDateTime(null)).toBeNull();
    expect(parseAsaasDateTime("lixo")).toBeNull();
  });
});
