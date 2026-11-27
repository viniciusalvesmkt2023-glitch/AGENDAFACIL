import { describe, expect, it } from "vitest";
import { earnsStamp, losesStamp, priceAfterReward, rewardLabel, stampCutoff } from "./loyalty";

const cfg = { loyaltyEnabled: true, loyaltyServiceIds: [] as string[], startDate: "2026-11-01" };
const base = { status: "COMPLETED", paymentStatus: "PENDING", date: "2026-11-20", serviceId: "corte", loyaltyRewardId: null as string | null };

describe("cartão fidelidade", () => {
  it("quem ganha selo", () => {
    expect(earnsStamp(base, cfg, "2026-11-27")).toBe(true);
    expect(earnsStamp({ ...base, status: "CONFIRMED", paymentStatus: "PAID" }, cfg, "2026-11-27")).toBe(true);
    expect(earnsStamp({ ...base, status: "CONFIRMED", paymentStatus: "PAID", date: "2026-12-05" }, cfg, "2026-11-27")).toBe(false); // pago antes de acontecer
    expect(earnsStamp({ ...base, status: "CONFIRMED" }, cfg, "2026-11-27")).toBe(false);
    expect(earnsStamp({ ...base, status: "CANCELED", paymentStatus: "PAID" }, cfg, "2026-11-27")).toBe(false);
    expect(earnsStamp({ ...base, status: "NO_SHOW" }, cfg, "2026-11-27")).toBe(false);
    expect(earnsStamp({ ...base, loyaltyRewardId: "r1" }, cfg, "2026-11-27")).toBe(false);
    expect(earnsStamp({ ...base, date: "2026-10-30" }, cfg, "2026-11-27")).toBe(false); // antes de ligar o cartão
    expect(earnsStamp(base, { ...cfg, loyaltyServiceIds: ["barba"] }, "2026-11-27")).toBe(false);
    expect(earnsStamp(base, { ...cfg, loyaltyEnabled: false }, "2026-11-27")).toBe(false);
  });
  it("quem perde selo", () => {
    expect(losesStamp({ ...base, status: "CANCELED" }, "2026-11-27")).toBe(true);
    expect(losesStamp({ ...base, status: "CONFIRMED" }, "2026-11-27")).toBe(true); // reabriu
    expect(losesStamp({ ...base, status: "CONFIRMED", paymentStatus: "PAID" }, "2026-11-27")).toBe(false);
    expect(losesStamp(base, "2026-11-27")).toBe(false);
  });
  it("prêmio", () => {
    expect(rewardLabel("FREE_SERVICE", 4500, "Corte")).toBe("corte grátis");
    expect(rewardLabel("PERCENT", 2000)).toBe("20% de desconto");
    expect(rewardLabel("AMOUNT", 1500)).toBe("R$ 15 de desconto");
    const free = { rewardType: "FREE_SERVICE", rewardValue: 4500, rewardServiceId: "corte" };
    expect(priceAfterReward(4500, free, "corte")).toBe(0);
    expect(priceAfterReward(7000, free, "combo")).toBe(2500);
    expect(priceAfterReward(3500, free, "barba")).toBe(0);
    expect(priceAfterReward(5000, { rewardType: "PERCENT", rewardValue: 2000, rewardServiceId: null }, "x")).toBe(4000);
    expect(priceAfterReward(1000, { rewardType: "AMOUNT", rewardValue: 1500, rewardServiceId: null }, "x")).toBe(0);
  });
  it("validade dos selos", () => {
    expect(stampCutoff("2026-11-27", 6)).toBe("2026-05-27");
    expect(stampCutoff("2026-08-31", 6)).toBe("2026-02-28");
    expect(stampCutoff("2026-11-27", null)).toBeNull();
  });
});
