import { describe, expect, it } from "vitest";
import { combinePeriods, summarizeWeek } from "./pro-hours";

describe("períodos do profissional", () => {
  it("junta os períodos marcados", () => {
    expect(combinePeriods(["tarde"])).toEqual({ start: 780, end: 1080, breakStart: null, breakEnd: null });
    expect(combinePeriods(["manha", "tarde"])).toEqual({ start: 480, end: 1080, breakStart: 720, breakEnd: 780 });
    expect(combinePeriods(["tarde", "noite"])).toEqual({ start: 780, end: 1320, breakStart: null, breakEnd: null });
    expect(combinePeriods(["noite", "manha"])).toEqual({ start: 480, end: 1320, breakStart: 720, breakEnd: 1080 });
    expect(combinePeriods(["manha", "tarde", "noite"])).toEqual({ start: 480, end: 1320, breakStart: 720, breakEnd: 780 });
    expect(combinePeriods([])).toBeNull();
  });
});

const row = (weekday: number, isOpen: boolean, startMinutes = 780, endMinutes = 1080) => ({ weekday, isOpen, startMinutes, endMinutes });

describe("resumo da semana", () => {
  it("dias seguidos com o mesmo horário", () => {
    expect(summarizeWeek([0, 1, 2, 3, 4, 5, 6].map((d) => row(d, d >= 1 && d <= 5)))).toBe("Seg a Sex · 13:00 – 18:00");
  });
  it("dias soltos e horários diferentes", () => {
    expect(summarizeWeek([row(1, true), row(3, true)])).toBe("Seg, Qua · 13:00 – 18:00");
    expect(summarizeWeek([row(1, true), row(2, true, 480), row(3, true)])).toBe("Seg a Qua · horários variados");
  });
  it("domingo fica no fim da semana", () => {
    expect(summarizeWeek([row(5, true), row(6, true), row(0, true)])).toBe("Sex a Dom · 13:00 – 18:00");
  });
  it("sem dias", () => {
    expect(summarizeWeek([row(1, false)])).toBe("Sem dias de atendimento");
  });
});
