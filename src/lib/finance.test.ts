import { describe, expect, it } from "vitest";
import { commissionFor, expenseDates, feeFor, growth, monthsCovered, previousRange, ruleLabel } from "./finance";

const fees = { feePixBps: 99, feeCashBps: 0, feeDebitBps: 199, feeCreditBps: 349 };

describe("finanças", () => {
  it("taxa por forma", () => {
    expect(feeFor("CREDIT", 10000, fees)).toBe(349);
    expect(feeFor("CARD", 10000, fees)).toBe(349);
    expect(feeFor("DEBIT", 10000, fees)).toBe(199);
    expect(feeFor("CASH", 10000, fees)).toBe(0);
    expect(feeFor(null, 10000, fees)).toBe(0);
  });
  it("meses do salário", () => {
    expect(monthsCovered("2026-11-01", "2026-11-30")).toBeCloseTo(1);
    expect(monthsCovered("2026-11-01", "2026-11-15")).toBeCloseTo(0.5);
    expect(monthsCovered("2026-11-01", "2026-12-31")).toBeCloseTo(2);
  });
  it("comissão", () => {
    const work = { services: 10, serviceCents: 50000, productCents: 10000 };
    expect(commissionFor({ commissionType: "PERCENT", commissionRate: 4000, productCommissionBps: 1000 }, work, 1)).toBe(21000);
    expect(commissionFor({ commissionType: "PER_SERVICE", commissionRate: 1500, productCommissionBps: 0 }, work, 1)).toBe(15000);
    expect(commissionFor({ commissionType: "SALARY", commissionRate: 200000, productCommissionBps: 0 }, work, 0.5)).toBe(100000);
    expect(commissionFor({ commissionType: "NONE", commissionRate: 0, productCommissionBps: 0 }, work, 1)).toBe(0);
    expect(ruleLabel({ commissionType: "PERCENT", commissionRate: 4000, productCommissionBps: 1000 })).toBe("40% dos serviços + 10% produtos");
    expect(ruleLabel({ commissionType: "PER_SERVICE", commissionRate: 1550, productCommissionBps: 0 })).toBe("R$ 15,50 por atendimento");
  });
  it("despesas fixas", () => {
    const rent = { date: "2026-01-31", recurring: true, endDate: null, amountCents: 1 };
    expect(expenseDates(rent, "2026-02-01", "2026-03-31")).toEqual(["2026-02-28", "2026-03-31"]);
    expect(expenseDates({ ...rent, endDate: "2026-02-28" }, "2026-02-01", "2026-03-31")).toEqual(["2026-02-28"]);
    expect(expenseDates({ ...rent, recurring: false }, "2026-01-01", "2026-01-31")).toEqual(["2026-01-31"]);
    expect(expenseDates({ ...rent, date: "2026-05-10" }, "2026-02-01", "2026-03-31")).toEqual([]);
  });
  it("período anterior e crescimento", () => {
    expect(previousRange("2026-11-01", "2026-11-30")).toEqual({ from: "2026-10-02", to: "2026-10-31" });
    expect(growth(110, 100)).toBe(10);
    expect(growth(5, 0)).toBeNull();
  });
});
