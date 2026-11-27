import { describe, expect, it } from "vitest";
import { formatDuration, isNewLesson, nextLesson, parseDuration } from "./lessons";

describe("aulas", () => {
  it("lê a duração digitada", () => {
    expect(parseDuration("5:20")).toBe(320);
    expect(parseDuration("0:45")).toBe(45);
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("5:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
  it("mostra a duração", () => {
    expect(formatDuration(320)).toBe("5:20");
    expect(formatDuration(45)).toBe("0:45");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(null)).toBe("");
  });
  it("etiqueta Nova por 14 dias", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(isNewLesson(new Date("2026-11-20T12:00:00Z"), now)).toBe(true);
    expect(isNewLesson(new Date("2026-11-01T12:00:00Z"), now)).toBe(false);
    expect(isNewLesson(null, now)).toBe(false);
  });
  it("próxima aula é a primeira não assistida", () => {
    const ls = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(nextLesson(ls, new Set(["a"]))?.id).toBe("b");
    expect(nextLesson(ls, new Set(["a", "b", "c"]))).toBeNull();
  });
});
