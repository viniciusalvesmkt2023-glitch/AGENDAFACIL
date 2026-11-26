import { describe, expect, it } from "vitest";
import { clientCanChange, deadlineLabel, minutesUntil } from "./policy";

const appt = { date: "2026-12-10", startMinutes: 600, status: "SCHEDULED" }; // 10/12 às 10:00
const free = { clientCancelPolicy: "FREE", cancelDeadlineMinutes: 120 };

describe("prazo para o cliente cancelar/remarcar", () => {
  it("conta minutos até o horário, inclusive de outro dia", () => {
    expect(minutesUntil(appt, { date: "2026-12-10", minutes: 540 })).toBe(60);
    expect(minutesUntil(appt, { date: "2026-12-09", minutes: 600 })).toBe(1440);
  });
  it("liberado: pode até a hora", () => {
    expect(clientCanChange(free, appt, { date: "2026-12-10", minutes: 599 }).allowed).toBe(true);
    expect(clientCanChange(free, appt, { date: "2026-12-10", minutes: 600 }).allowed).toBe(false);
  });
  it("com prazo: só até X antes", () => {
    const r = { clientCancelPolicy: "DEADLINE", cancelDeadlineMinutes: 120 };
    expect(clientCanChange(r, appt, { date: "2026-12-10", minutes: 480 }).allowed).toBe(true); // 2h antes
    const late = clientCanChange(r, appt, { date: "2026-12-10", minutes: 481 });
    expect(late.allowed).toBe(false);
    expect(!late.allowed && late.reason).toContain("2 horas");
  });
  it("não permitir: nunca pelo link; encerrados também não", () => {
    expect(clientCanChange({ ...free, clientCancelPolicy: "NEVER" }, appt, { date: "2026-12-01", minutes: 0 }).allowed).toBe(false);
    expect(clientCanChange(free, { ...appt, status: "CANCELED" }, { date: "2026-12-01", minutes: 0 }).allowed).toBe(false);
  });
  it("rótulos", () => {
    expect(deadlineLabel(60)).toBe("1 hora");
    expect(deadlineLabel(720)).toBe("12 horas");
    expect(deadlineLabel(2880)).toBe("2 dias");
  });
});
