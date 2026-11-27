import { describe, expect, it } from "vitest";
import { extendPeriod, getAccessState, hasAccess, periodProgress } from "./subscription";
import { discountPercent, monthlyEquivalentCents, PLANS } from "./plans";

const now = new Date("2026-11-20T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("getAccessState", () => {
  it("teste grátis em andamento", () => {
    expect(getAccessState({ subscriptionStatus: "TRIALING", trialEndsAt: days(3), currentPeriodEnd: null }, now)).toEqual({ kind: "trial", daysLeft: 3 });
  });

  it("bloqueia quando o teste acaba sem assinatura", () => {
    const s = { subscriptionStatus: "TRIALING", trialEndsAt: days(-1), currentPeriodEnd: null };
    expect(getAccessState(s, now)).toEqual({ kind: "blocked", reason: "trial_ended" });
    expect(hasAccess(s, now)).toBe(false);
  });

  it("assinatura ativa", () => {
    expect(getAccessState({ subscriptionStatus: "ACTIVE", trialEndsAt: days(-30), currentPeriodEnd: days(10) }, now).kind).toBe("active");
  });

  it("tolerância de 3 dias após vencer e depois bloqueia", () => {
    expect(getAccessState({ subscriptionStatus: "PAST_DUE", trialEndsAt: days(-30), currentPeriodEnd: days(-1) }, now)).toEqual({ kind: "grace", daysLeft: 2 });
    expect(getAccessState({ subscriptionStatus: "PAST_DUE", trialEndsAt: days(-30), currentPeriodEnd: days(-4) }, now)).toEqual({ kind: "blocked", reason: "expired" });
  });

  it("cancelada continua até o fim do período pago, sem tolerância", () => {
    expect(getAccessState({ subscriptionStatus: "CANCELED", trialEndsAt: days(-30), currentPeriodEnd: days(5) }, now).kind).toBe("active");
    expect(getAccessState({ subscriptionStatus: "CANCELED", trialEndsAt: days(-30), currentPeriodEnd: days(-1) }, now)).toEqual({ kind: "blocked", reason: "canceled" });
  });

  it("quem assina durante o teste fica ativo", () => {
    expect(getAccessState({ subscriptionStatus: "ACTIVE", trialEndsAt: days(3), currentPeriodEnd: days(33) }, now).kind).toBe("active");
  });
});

describe("extendPeriod", () => {
  it("soma a partir de hoje quando já venceu", () => {
    expect(extendPeriod(days(-10), 1, now).toISOString()).toBe("2026-12-20T12:00:00.000Z");
  });
  it("soma a partir do vencimento quando ainda está ativo (renovação antecipada)", () => {
    expect(extendPeriod(new Date("2026-12-01T00:00:00Z"), 6, now).toISOString()).toBe("2027-06-01T00:00:00.000Z");
  });
  it("trata fim de mês", () => {
    expect(extendPeriod(null, 1, new Date("2027-01-31T10:00:00Z")).toISOString()).toBe("2027-02-28T10:00:00.000Z");
  });
});

describe("planos", () => {
  it("valores e descontos", () => {
    expect(PLANS.MONTHLY.priceCents).toBe(3790);
    expect(monthlyEquivalentCents(PLANS.SEMIANNUAL)).toBe(3290);
    expect(monthlyEquivalentCents(PLANS.ANNUAL)).toBe(2790);
    expect(discountPercent(PLANS.SEMIANNUAL)).toBe(13);
    expect(discountPercent(PLANS.ANNUAL)).toBe(26);
  });
});

describe("periodProgress", () => {
  it("conta quanto do período passou e os dias que faltam", () => {
    const end = new Date("2026-12-02T12:00:00Z");
    const r = periodProgress(end, 1, new Date("2026-11-07T12:00:00Z"));
    expect(r.daysLeft).toBe(25);
    expect(r.pct).toBeGreaterThan(10);
    expect(r.pct).toBeLessThan(25);
    expect(periodProgress(end, 1, new Date("2026-12-10T12:00:00Z"))).toEqual({ pct: 100, daysLeft: 0 });
  });
});
