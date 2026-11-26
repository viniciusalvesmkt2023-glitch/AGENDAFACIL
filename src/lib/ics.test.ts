import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("calendário .ics", () => {
  it("monta o evento com horário em UTC, local e lembrete", () => {
    const ics = buildIcs({ uid: "x@horaboa.com", start: new Date("2026-11-29T13:00:00Z"), end: new Date("2026-11-29T13:30:00Z"), title: "Corte; barba, João", location: "Rua A, 1" });
    expect(ics).toContain("DTSTART:20261129T130000Z");
    expect(ics).toContain("DTEND:20261129T133000Z");
    expect(ics).toContain(String.raw`SUMMARY:Corte\; barba\, João`);
    expect(ics).toContain(String.raw`LOCATION:Rua A\, 1`);
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.split("\r\n").filter(Boolean).at(-1)).toBe("END:VCALENDAR");
  });
});
