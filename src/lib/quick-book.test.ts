import { describe, expect, it } from "vitest";
import { countConflicts, planSlots } from "./quick-book";

describe("agendamento rápido", () => {
  it("serviços em sequência", () => {
    expect(planSlots("2026-12-01", 900, [30, 45])).toEqual([
      { date: "2026-12-01", start: 900, end: 930, item: 0 },
      { date: "2026-12-01", start: 930, end: 975, item: 1 },
    ]);
  });
  it("repete a cada semana", () => {
    const s = planSlots("2026-12-29", 600, [30], { everyWeeks: 1, times: 3 });
    expect(s.map((x) => x.date)).toEqual(["2026-12-29", "2027-01-05", "2027-01-12"]);
    expect(planSlots("2026-12-01", 600, [30], { everyWeeks: 2, times: 2 }).map((x) => x.date)).toEqual(["2026-12-01", "2026-12-15"]);
  });
  it("conta encaixes", () => {
    const s = planSlots("2026-12-01", 900, [30, 30]);
    expect(countConflicts(s, [{ date: "2026-12-01", start: 920, end: 940 }])).toBe(2);
    expect(countConflicts(s, [{ date: "2026-12-01", start: 960, end: 990 }])).toBe(0);
    expect(countConflicts(s, [{ date: "2026-12-02", start: 900, end: 930 }])).toBe(0);
  });
});
