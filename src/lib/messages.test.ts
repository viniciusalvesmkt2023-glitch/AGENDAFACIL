import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, renderMessage, SAMPLE_VARS } from "./messages";

describe("renderMessage", () => {
  it("substitui todas as variáveis", () => {
    const text = renderMessage(DEFAULT_CONFIRMATION, SAMPLE_VARS);
    expect(text).toContain("Olá, Maria!");
    expect(text).toContain("*Seu Salão*");
    expect(text).toContain("amanhã às 14:00");
    expect(text).not.toMatch(/\{\w+\}/);
    expect(renderMessage(DEFAULT_REMINDER, SAMPLE_VARS)).not.toMatch(/\{\w+\}/);
  });
  it("mantém variáveis desconhecidas e repete as conhecidas", () => {
    expect(renderMessage("{nome} {xyz} {nome}", SAMPLE_VARS)).toBe("Maria {xyz} Maria");
  });
});
