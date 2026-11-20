import { describe, expect, it } from "vitest";
import { computeAvailableSlots, isSlotFree } from "./availability";
import { addDays, diffDays, isValidDate, minutesToTime, nowInTimezone, timeToMinutes, weekdayOf } from "./time";

const hours = { isOpen: true, startMinutes: 9 * 60, endMinutes: 12 * 60, breakStart: null, breakEnd: null };

describe("computeAvailableSlots", () => {
  it("gera horários dentro do expediente", () => {
    const slots = computeAvailableSlots({ hours, durationMinutes: 60, slotInterval: 30, busy: [] });
    expect(slots.map(minutesToTime)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("retorna vazio quando fechado", () => {
    expect(computeAvailableSlots({ hours: { ...hours, isOpen: false }, durationMinutes: 30, slotInterval: 30, busy: [] })).toEqual([]);
    expect(computeAvailableSlots({ hours: null, durationMinutes: 30, slotInterval: 30, busy: [] })).toEqual([]);
  });

  it("remove horários que conflitam com agendamentos existentes", () => {
    const slots = computeAvailableSlots({
      hours,
      durationMinutes: 30,
      slotInterval: 30,
      busy: [{ startMinutes: 600, endMinutes: 660 }], // 10:00-11:00
    });
    expect(slots.map(minutesToTime)).toEqual(["09:00", "09:30", "11:00", "11:30"]);
  });

  it("não permite que um serviço longo invada um agendamento", () => {
    const slots = computeAvailableSlots({
      hours,
      durationMinutes: 60,
      slotInterval: 30,
      busy: [{ startMinutes: 600, endMinutes: 630 }], // 10:00-10:30
    });
    expect(slots.map(minutesToTime)).toEqual(["09:00", "10:30", "11:00"]);
  });

  it("respeita o intervalo de almoço", () => {
    const slots = computeAvailableSlots({
      hours: { isOpen: true, startMinutes: 540, endMinutes: 840, breakStart: 720, breakEnd: 780 },
      durationMinutes: 60,
      slotInterval: 60,
      busy: [],
    });
    expect(slots.map(minutesToTime)).toEqual(["09:00", "10:00", "11:00", "13:00"]);
  });

  it("respeita a antecedência mínima", () => {
    const slots = computeAvailableSlots({ hours, durationMinutes: 30, slotInterval: 30, busy: [], earliestStart: 615 });
    expect(slots.map(minutesToTime)).toEqual(["10:30", "11:00", "11:30"]);
  });
});

describe("isSlotFree", () => {
  it("valida horário livre e ocupado", () => {
    const busy = [{ startMinutes: 600, endMinutes: 660 }];
    expect(isSlotFree({ hours, durationMinutes: 30, busy, startMinutes: 540 })).toBe(true);
    expect(isSlotFree({ hours, durationMinutes: 30, busy, startMinutes: 630 })).toBe(false);
    expect(isSlotFree({ hours, durationMinutes: 60, busy, startMinutes: 570 })).toBe(false);
    expect(isSlotFree({ hours, durationMinutes: 30, busy, startMinutes: 690 })).toBe(true); // 11:30-12:00
    expect(isSlotFree({ hours, durationMinutes: 30, busy, startMinutes: 705 })).toBe(false); // 11:45-12:15 passa do fechamento
  });
});

describe("time helpers", () => {
  it("calcula dias e semanas", () => {
    expect(weekdayOf("2026-11-20")).toBe(5); // sexta
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-11-20", "2026-12-20")).toBe(30);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(timeToMinutes("08:30")).toBe(510);
  });

  it("converte o horário atual para o fuso do estabelecimento", () => {
    // 2026-11-20 02:30 UTC = 2026-11-19 23:30 em São Paulo (UTC-3)
    const now = nowInTimezone("America/Sao_Paulo", new Date("2026-11-20T02:30:00Z"));
    expect(now).toEqual({ date: "2026-11-19", minutes: 23 * 60 + 30 });
  });
});
