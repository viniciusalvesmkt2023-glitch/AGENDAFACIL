import { describe, expect, it } from "vitest";
import { dueReminder, whenText } from "./reminders";

const H = 3_600_000;
const now = new Date("2026-11-20T12:00:00Z");
const at = (h: number) => new Date(now.getTime() + h * H);
const base = { reminder24hSentAt: null, reminder1hSentAt: null };

describe("dueReminder", () => {
  it("envia 24h antes quando agendado com mais de 26h de antecedência", () => {
    expect(dueReminder({ ...base, start: at(23.9), createdAt: at(-72) }, now)).toBe("REMINDER_24H");
    expect(dueReminder({ ...base, start: at(25), createdAt: at(-72) }, now)).toBeNull();
  });

  it("não envia o de 24h para agendamentos do mesmo dia ou de véspera em cima da hora", () => {
    // agendou às 9h para as 16h do mesmo dia
    expect(dueReminder({ ...base, start: at(7), createdAt: at(0) }, now)).toBeNull();
    // agendou ontem às 10h para hoje às 9h (23h de antecedência)
    expect(dueReminder({ ...base, start: at(20), createdAt: at(-3) }, now)).toBeNull();
  });

  it("envia 1h antes (agendou às 9h para as 16h → lembrete às 15h)", () => {
    expect(dueReminder({ ...base, start: at(1), createdAt: at(-6) }, now)).toBe("REMINDER_1H");
    expect(dueReminder({ ...base, start: at(0.8), createdAt: at(-6) }, now)).toBe("REMINDER_1H");
    expect(dueReminder({ ...base, start: at(1.2), createdAt: at(-6) }, now)).toBeNull(); // ainda cedo
  });

  it("não envia o de 1h se agendou com 2h ou menos de antecedência", () => {
    expect(dueReminder({ ...base, start: at(0.9), createdAt: at(-1) }, now)).toBeNull();
    expect(dueReminder({ ...base, start: at(0.5), createdAt: at(-1.5) }, now)).toBeNull();
  });

  it("não repete lembretes já enviados nem envia após o horário", () => {
    expect(dueReminder({ reminder24hSentAt: at(-1), reminder1hSentAt: null, start: at(10), createdAt: at(-72) }, now)).toBeNull();
    expect(dueReminder({ reminder24hSentAt: at(-23), reminder1hSentAt: at(-0.1), start: at(0.9), createdAt: at(-72) }, now)).toBeNull();
    expect(dueReminder({ ...base, start: at(-0.5), createdAt: at(-72) }, now)).toBeNull();
  });

  it("se o de 24h não saiu e já está a 1h, envia só o de 1h", () => {
    expect(dueReminder({ ...base, start: at(0.9), createdAt: at(-72) }, now)).toBe("REMINDER_1H");
  });
});

describe("whenText", () => {
  it("formata hoje/amanhã/data", () => {
    expect(whenText("2026-11-20", "14:00", "2026-11-20", "2026-11-21", "x")).toBe("hoje às 14:00");
    expect(whenText("2026-11-21", "09:30", "2026-11-20", "2026-11-21", "x")).toBe("amanhã às 09:30");
    expect(whenText("2026-11-27", "10:00", "2026-11-20", "2026-11-21", "sexta-feira, 27 de novembro")).toBe("sexta-feira, 27 de novembro às 10:00");
  });
});
