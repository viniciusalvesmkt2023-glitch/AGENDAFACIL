import { describe, expect, it } from "vitest";
import { blockAppliesOn, blockIntervals, effectiveHours, openWeekdays, type BlockRow, type HourRow } from "./schedule";
import { computeAvailableSlots, isSlotFree } from "./availability";

const block = (b: Partial<BlockRow>): BlockRow => ({
  kind: "ONCE", date: "2026-12-10", endDate: null, weekday: null, startMinutes: null, endMinutes: null, professionalId: null, ...b,
});

describe("bloqueios", () => {
  it("pontual vale só no dia; período vale do início ao fim", () => {
    expect(blockAppliesOn(block({}), "2026-12-10", 4)).toBe(true);
    expect(blockAppliesOn(block({}), "2026-12-11", 5)).toBe(false);
    const ferias = block({ endDate: "2026-12-20" });
    expect(blockAppliesOn(ferias, "2026-12-15", 2)).toBe(true);
    expect(blockAppliesOn(ferias, "2026-12-21", 1)).toBe(false);
  });
  it("semanal vale no dia da semana a partir da data, até o fim (se tiver)", () => {
    const b = block({ kind: "WEEKLY", weekday: 2, date: "2026-12-01", endDate: "2026-12-31" });
    expect(blockAppliesOn(b, "2026-12-08", 2)).toBe(true);
    expect(blockAppliesOn(b, "2026-11-24", 2)).toBe(false); // antes de começar
    expect(blockAppliesOn(b, "2026-12-09", 3)).toBe(false); // outro dia
    expect(blockAppliesOn(b, "2027-01-05", 2)).toBe(false); // depois do fim
  });
  it("geral vale para todos; individual só para o profissional", () => {
    const list = [block({ startMinutes: 600, endMinutes: 660 }), block({ professionalId: "ana", startMinutes: 900, endMinutes: 960 })];
    expect(blockIntervals(list, "2026-12-10", 4, "ana")).toHaveLength(2);
    expect(blockIntervals(list, "2026-12-10", 4, "joao")).toEqual([{ startMinutes: 600, endMinutes: 660 }]);
    expect(blockIntervals([block({})], "2026-12-10", 4, "joao")).toEqual([{ startMinutes: 0, endMinutes: 1440 }]);
  });
});

describe("horário por profissional", () => {
  const biz: HourRow[] = [{ weekday: 1, isOpen: true, startMinutes: 540, endMinutes: 1080 }, { weekday: 2, isOpen: true, startMinutes: 540, endMinutes: 1080 }];
  const own: HourRow[] = [{ weekday: 1, isOpen: false, startMinutes: 540, endMinutes: 1080 }, { weekday: 2, isOpen: true, startMinutes: 780, endMinutes: 1200 }];
  it("segue o estabelecimento ou usa o próprio", () => {
    expect(effectiveHours({ customHours: false, hours: own }, biz, 2)?.startMinutes).toBe(540);
    expect(effectiveHours({ customHours: true, hours: own }, biz, 2)?.startMinutes).toBe(780);
    expect(openWeekdays({ customHours: true, hours: own }, biz)).toEqual([2]);
  });
});

describe("intervalo entre atendimentos e bloqueios no cálculo", () => {
  const hours = { isOpen: true, startMinutes: 540, endMinutes: 720 };
  it("intervalo de 15 min empurra o próximo horário", () => {
    const busy = [{ startMinutes: 600, endMinutes: 630 }]; // 10:00-10:30
    const slots = computeAvailableSlots({ hours, durationMinutes: 30, slotInterval: 15, busy, bufferMinutes: 15 });
    expect(slots).not.toContain(630); // 10:30 colado no anterior
    expect(slots).toContain(645); // 10:45 respeita o intervalo
    expect(slots).toContain(555); // 09:15-09:45 + 15 de folga = 10:00: cabe
    expect(slots).not.toContain(570); // 09:30-10:00 não deixa a folga antes das 10:00
    expect(slots).toContain(540);
  });
  it("bloqueio tira os horários, sem intervalo extra", () => {
    const blocks = [{ startMinutes: 600, endMinutes: 660 }];
    const slots = computeAvailableSlots({ hours, durationMinutes: 30, slotInterval: 30, busy: [], blocks, bufferMinutes: 15 });
    expect(slots).toEqual([540, 570, 660, 690]);
    expect(isSlotFree({ hours, durationMinutes: 30, busy: [], blocks, startMinutes: 630 })).toBe(false);
  });
});
