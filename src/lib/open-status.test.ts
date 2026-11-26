import { describe, expect, it } from "vitest";
import { openStatus } from "./open-status";

const week = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday, isOpen: weekday !== 0, startMinutes: 540, endMinutes: weekday === 6 ? 840 : 1140, breakStart: weekday === 6 ? null : 720, breakEnd: weekday === 6 ? null : 780,
}));

describe("aberto agora", () => {
  it("aberto: até o almoço ou até fechar", () => {
    expect(openStatus(week, { weekday: 1, minutes: 600 })).toEqual({ open: true, text: "até 12h" });
    expect(openStatus(week, { weekday: 1, minutes: 900 })).toEqual({ open: true, text: "até 19h" });
  });
  it("no almoço, antes de abrir e depois de fechar", () => {
    expect(openStatus(week, { weekday: 1, minutes: 750 })).toEqual({ open: false, text: "volta às 13h" });
    expect(openStatus(week, { weekday: 1, minutes: 480 })).toEqual({ open: false, text: "abre hoje às 9h" });
    expect(openStatus(week, { weekday: 1, minutes: 1200 })).toEqual({ open: false, text: "abre amanhã às 9h" });
    expect(openStatus(week, { weekday: 6, minutes: 900 })).toEqual({ open: false, text: "abre segunda às 9h" });
  });
  it("bloqueado hoje", () => {
    expect(openStatus(week, { weekday: 1, minutes: 600 }, true)).toEqual({ open: false, text: "abre amanhã às 9h" });
  });
});
