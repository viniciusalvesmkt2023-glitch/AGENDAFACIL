import { describe, expect, it } from "vitest";
import { parseDate, parseMoney, parsePaid, parseTime, periodRange } from "./appointments-list";

describe("períodos", () => {
  it("calcula as datas", () => {
    expect(periodRange("hoje", "2026-11-27")).toEqual({ from: "2026-11-27", to: "2026-11-27" });
    expect(periodRange("semana", "2026-11-27")).toEqual({ from: "2026-11-22", to: "2026-11-28" });
    expect(periodRange("mes", "2026-11-27")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange("anterior", "2026-01-10")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(periodRange("mes", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(periodRange("datas", "2026-11-27", "2026-11-03", "2026-11-01")).toEqual({ from: "2026-11-03", to: "2026-11-03" });
  });
});

describe("planilha", () => {
  it("datas", () => {
    expect(parseDate("27/11/2026")).toBe("2026-11-27");
    expect(parseDate("2026-11-27")).toBe("2026-11-27");
    expect(parseDate("1/2/27")).toBe("2027-02-01");
    expect(parseDate(46353)).toBe("2026-11-27");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("amanhã")).toBeNull();
  });
  it("horários", () => {
    expect(parseTime("14:30")).toBe(870);
    expect(parseTime("9h")).toBe(540);
    expect(parseTime("9h15")).toBe(555);
    expect(parseTime(0.5)).toBe(720);
    expect(parseTime("25:00")).toBeNull();
  });
  it("valor e pagamento", () => {
    expect(parseMoney("R$ 1.234,50")).toBe(123450);
    expect(parseMoney("45")).toBe(4500);
    expect(parseMoney(45.5)).toBe(4550);
    expect(parseMoney("")).toBeNull();
    expect(parsePaid("Pix")).toBe("PIX");
    expect(parsePaid("Cartão de crédito")).toBe("CREDIT");
    expect(parsePaid("débito")).toBe("DEBIT");
    expect(parsePaid("sim")).toBe("CASH");
    expect(parsePaid("não")).toBeNull();
    expect(parsePaid("")).toBeNull();
  });
});
