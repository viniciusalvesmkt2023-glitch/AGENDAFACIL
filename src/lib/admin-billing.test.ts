import { describe, expect, it } from "vitest";
import { cancelAccessData, extendAccessData, grantPlanData } from "./admin-billing";
import { hasAccess } from "./subscription";

const now = new Date("2026-11-27T12:00:00Z");
const day = (d: string) => new Date(`${d}T12:00:00Z`);

describe("ações de assinatura do admin", () => {
  it("teste grátis ativo ganha mais dias a partir do fim atual", () => {
    const r = extendAccessData({ subscriptionStatus: "TRIALING", trialEndsAt: day("2026-11-30"), currentPeriodEnd: null }, 7, now);
    expect(r.data).toEqual({ trialEndsAt: day("2026-12-07") });
  });
  it("teste que já acabou volta a valer a partir de hoje", () => {
    const b = { subscriptionStatus: "TRIALING", trialEndsAt: day("2026-11-01"), currentPeriodEnd: null };
    const r = extendAccessData(b, 7, now);
    expect(r.data).toEqual({ trialEndsAt: day("2026-12-04") });
    expect(hasAccess({ ...b, ...r.data }, now)).toBe(true);
  });
  it("assinante ganha dias no período pago", () => {
    const r = extendAccessData({ subscriptionStatus: "ACTIVE", trialEndsAt: day("2026-10-01"), currentPeriodEnd: day("2026-12-10") }, 30, now);
    expect(r.data).toEqual({ subscriptionStatus: "ACTIVE", currentPeriodEnd: day("2027-01-09") });
  });
  it("cancelado volta a ter acesso ao estender", () => {
    const b = { subscriptionStatus: "CANCELED", trialEndsAt: day("2026-10-01"), currentPeriodEnd: day("2026-11-20") };
    const r = extendAccessData(b, 30, now);
    expect(hasAccess({ ...b, ...r.data }, now)).toBe(true);
  });
  it("ativar plano manual soma os meses", () => {
    const r = grantPlanData({ subscriptionStatus: "TRIALING", trialEndsAt: day("2026-11-30"), currentPeriodEnd: null }, "ANNUAL", 12, now);
    expect(r.subscriptionStatus).toBe("ACTIVE");
    expect(r.currentPeriodEnd.toISOString().slice(0, 10)).toBe("2027-11-27");
  });
  it("cancelar corta o acesso na hora (inclusive no teste)", () => {
    for (const b of [
      { subscriptionStatus: "ACTIVE", trialEndsAt: day("2026-10-01"), currentPeriodEnd: day("2027-06-01") },
      { subscriptionStatus: "TRIALING", trialEndsAt: day("2026-12-02"), currentPeriodEnd: null },
    ]) {
      expect(hasAccess({ ...b, ...cancelAccessData(b, now) }, now)).toBe(false);
    }
  });
});
