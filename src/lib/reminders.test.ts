import { describe, expect, it } from "vitest";
import { dueReminder, reminderSchedule, shortLabel, whenText } from "./reminders";

const TZ = "America/Sao_Paulo";
type Sent = { reminderDaySentAt: Date | null; reminderShortSentAt: Date | null };
const fresh: Sent = { reminderDaySentAt: null, reminderShortSentAt: null };
// horário local de SP -> Date
const sp = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00-03:00`);
const DEFAULT = { dayMode: "24H", dayTime: 1080, shortMinutes: 60 };

function due(cfg: typeof DEFAULT, appt: { date: string; start: string }, createdAt: Date, now: Date, sent: Sent = fresh) {
  const [h, m] = appt.start.split(":").map(Number);
  const sched = reminderSchedule({ date: appt.date, startMinutes: h * 60 + m }, cfg, TZ);
  return dueReminder({ createdAt, ...sent }, sched, now);
}

describe("lembrete curto (padrão 1h antes)", () => {
  const appt = { date: "2026-11-20", start: "16:00" };
  const created = sp("2026-11-20", "09:00");
  it("agendou às 9h para as 16h → sai às 15h", () => {
    expect(due(DEFAULT, appt, created, sp("2026-11-20", "14:50"))).toBeNull();
    expect(due(DEFAULT, appt, created, sp("2026-11-20", "15:00"))).toBe("REMINDER_SHORT");
    expect(due(DEFAULT, appt, created, sp("2026-11-20", "15:10"))).toBe("REMINDER_SHORT");
  });
  it("não sai se agendou em cima da hora", () => {
    expect(due(DEFAULT, appt, sp("2026-11-20", "14:30"), sp("2026-11-20", "15:00"))).toBeNull();
  });
  it("respeita a antecedência configurada (3h e 30 min)", () => {
    expect(due({ ...DEFAULT, shortMinutes: 180 }, appt, created, sp("2026-11-20", "13:00"))).toBe("REMINDER_SHORT");
    expect(due({ ...DEFAULT, shortMinutes: 30 }, appt, created, sp("2026-11-20", "15:00"))).toBeNull();
    expect(due({ ...DEFAULT, shortMinutes: 30 }, appt, created, sp("2026-11-20", "15:30"))).toBe("REMINDER_SHORT");
  });
  it("desligado não envia", () => {
    expect(due({ ...DEFAULT, shortMinutes: 0 }, appt, created, sp("2026-11-20", "15:30"))).toBeNull();
  });
  it("não envia depois do horário nem repete", () => {
    expect(due(DEFAULT, appt, created, sp("2026-11-20", "16:05"))).toBeNull();
    expect(due(DEFAULT, appt, created, sp("2026-11-20", "15:30"), { reminderDaySentAt: null, reminderShortSentAt: new Date() })).toBeNull();
  });
});

describe("lembrete antecipado 24h", () => {
  const appt = { date: "2026-11-25", start: "10:00" };
  it("sai 24h antes para quem agendou com antecedência", () => {
    expect(due(DEFAULT, appt, sp("2026-11-22", "12:00"), sp("2026-11-24", "09:50"))).toBeNull();
    expect(due(DEFAULT, appt, sp("2026-11-22", "12:00"), sp("2026-11-24", "10:00"))).toBe("REMINDER_DAY");
  });
  it("não sai para quem agendou na véspera em cima da hora", () => {
    expect(due(DEFAULT, appt, sp("2026-11-24", "09:00"), sp("2026-11-24", "10:00"))).toBeNull();
  });
  it("desligado não envia", () => {
    expect(due({ ...DEFAULT, dayMode: "OFF" }, appt, sp("2026-11-22", "12:00"), sp("2026-11-24", "10:00"))).toBeNull();
  });
});

describe("lembrete na véspera em horário fixo (18h)", () => {
  const cfg = { ...DEFAULT, dayMode: "EVENING", dayTime: 18 * 60 };
  const appt = { date: "2026-11-25", start: "09:00" };
  it("sai às 18h do dia anterior", () => {
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-24", "17:50"))).toBeNull();
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-24", "18:00"))).toBe("REMINDER_DAY");
  });
  it("quem agendou depois das 16h da véspera não recebe (acabou de receber a confirmação)", () => {
    expect(due(cfg, appt, sp("2026-11-24", "17:00"), sp("2026-11-24", "18:00"))).toBeNull();
  });
  it("não manda o da véspera atrasado de madrugada (passou mais de 3h do horário programado)", () => {
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-24", "20:59"))).toBe("REMINDER_DAY");
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-24", "21:01"))).toBeNull();
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-25", "00:50"))).toBeNull();
    // o lembrete curto continua saindo
    expect(due(cfg, appt, sp("2026-11-20", "12:00"), sp("2026-11-25", "08:00"))).toBe("REMINDER_SHORT");
  });
  it("agendamento do mesmo dia não recebe lembrete de véspera", () => {
    expect(due(cfg, appt, sp("2026-11-25", "07:00"), sp("2026-11-25", "07:30"))).toBeNull();
  });
});

describe("combinação", () => {
  it("se o antecipado não saiu e já chegou a hora do curto, envia só o curto", () => {
    const appt = { date: "2026-11-25", start: "10:00" };
    expect(due(DEFAULT, appt, sp("2026-11-20", "12:00"), sp("2026-11-25", "09:10"))).toBe("REMINDER_SHORT");
  });
  it("antecipado que cairia depois do curto é ignorado", () => {
    // consulta 00:30, véspera às 23:00 e curto 4h antes (20:30) → véspera seria depois do curto
    const s = reminderSchedule({ date: "2026-11-25", startMinutes: 30 }, { dayMode: "EVENING", dayTime: 23 * 60, shortMinutes: 240 }, TZ);
    expect(s.dayAt).toBeNull();
  });
});

describe("textos", () => {
  it("whenText e shortLabel", () => {
    expect(whenText("2026-11-20", "14:00", "2026-11-20", "2026-11-21", "x")).toBe("hoje às 14:00");
    expect(whenText("2026-11-21", "09:30", "2026-11-20", "2026-11-21", "x")).toBe("amanhã às 09:30");
    expect(shortLabel(30)).toBe("30 minutos antes");
    expect(shortLabel(60)).toBe("1 hora antes");
    expect(shortLabel(180)).toBe("3 horas antes");
    expect(shortLabel(0)).toBe("Desligado");
  });
});
