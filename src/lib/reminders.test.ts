import { describe, expect, it } from "vitest";
import { dueReminder, whenText } from "./reminders";

const H = 3_600_000;
const now = new Date("2026-11-20T12:00:00Z");
const at = (h: number) => new Date(now.getTime() + h * H);
const base = { reminder24hSentAt: null, reminder2hSentAt: null };

describe("dueReminder", () => {
  it("envia 24h antes quando agendado com antecedência", () => {
    expect(dueReminder({ ...base, start: at(23.9), createdAt: at(-72) }, now)).toBe("REMINDER_24H");
    expect(dueReminder({ ...base, start: at(25), createdAt: at(-72) }, now)).toBeNull();
  });
  it("envia 2h antes", () => {
    expect(dueReminder({ ...base, reminder24hSentAt: at(-22), start: at(1.9), createdAt: at(-72) }, now)).toBe("REMINDER_2H");
  });
  it("não envia nada para agendamentos em cima da hora", () => {
    expect(dueReminder({ ...base, start: at(1.5), createdAt: at(-1) }, now)).toBeNull();
    expect(dueReminder({ ...base, start: at(20), createdAt: at(-2) }, now)).toBeNull();
  });
  it("não repete lembretes já enviados nem envia após o horário", () => {
    expect(dueReminder({ reminder24hSentAt: at(-1), reminder2hSentAt: null, start: at(10), createdAt: at(-72) }, now)).toBeNull();
    expect(dueReminder({ reminder24hSentAt: at(-22), reminder2hSentAt: at(-1), start: at(1), createdAt: at(-72) }, now)).toBeNull();
    expect(dueReminder({ ...base, start: at(-0.5), createdAt: at(-72) }, now)).toBeNull();
  });
  it("se o de 24h não saiu e já está a 2h, envia só o de 2h", () => {
    expect(dueReminder({ ...base, start: at(1.5), createdAt: at(-72) }, now)).toBe("REMINDER_2H");
  });
});

describe("whenText", () => {
  it("formata hoje/amanhã/data", () => {
    expect(whenText("2026-11-20", "14:00", "2026-11-20", "2026-11-21", "x")).toBe("hoje às 14:00");
    expect(whenText("2026-11-21", "09:30", "2026-11-20", "2026-11-21", "x")).toBe("amanhã às 09:30");
    expect(whenText("2026-11-27", "10:00", "2026-11-20", "2026-11-21", "sexta-feira, 27 de novembro")).toBe("sexta-feira, 27 de novembro às 10:00");
  });
});
