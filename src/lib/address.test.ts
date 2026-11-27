import { describe, expect, it } from "vitest";
import { composeAddress, formatCep, parseAddress } from "./address";

const base = { zipCode: "01310-100", street: "Avenida Paulista", addressNumber: "37", district: "Bela Vista", city: "São Paulo", state: "sp" };

describe("endereço", () => {
  it("formata o CEP", () => {
    expect(formatCep("01310100")).toBe("01310-100");
    expect(formatCep("0131")).toBe("0131");
    expect(formatCep("01.310-100 x")).toBe("01310-100");
  });

  it("monta o endereço completo", () => {
    expect(composeAddress({ street: "Rua A", addressNumber: "37", complement: "Sala 2", district: "Centro", city: "Bauru", state: "SP" })).toBe(
      "Rua A, 37 - Sala 2 - Centro, Bauru - SP",
    );
    expect(composeAddress({ street: "Rua A", addressNumber: "S/N", district: "Centro", city: "Bauru", state: "sp" })).toBe("Rua A, S/N - Centro, Bauru - SP");
  });

  it("lê o formulário", () => {
    const r = parseAddress(base);
    expect(r).toEqual({
      kind: "ok",
      address: "Avenida Paulista, 37 - Bela Vista, São Paulo - SP",
      parts: { zipCode: "01310100", street: "Avenida Paulista", addressNumber: "37", complement: null, district: "Bela Vista", city: "São Paulo", state: "SP" },
    });
  });

  it("aceita sem número", () => {
    const r = parseAddress({ ...base, addressNumber: "", noNumber: "on" });
    expect(r.kind === "ok" && r.parts.addressNumber).toBe("S/N");
  });

  it("pede o que falta", () => {
    expect(parseAddress({ ...base, addressNumber: "" })).toMatchObject({ kind: "error", error: expect.stringContaining("número") });
    expect(parseAddress({ ...base, district: "" })).toMatchObject({ kind: "error", error: expect.stringContaining("bairro") });
    expect(parseAddress({ ...base, zipCode: "0131" })).toMatchObject({ kind: "error", error: expect.stringContaining("CEP") });
    expect(parseAddress({ ...base, state: "S" })).toMatchObject({ kind: "error" });
  });

  it("atendimento a domicílio e formulário vazio", () => {
    expect(parseAddress({ ...base, homeService: "on" })).toEqual({ kind: "home" });
    expect(parseAddress({})).toEqual({ kind: "empty" });
  });
});
