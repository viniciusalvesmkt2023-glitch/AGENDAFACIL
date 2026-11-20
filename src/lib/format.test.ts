import { describe, expect, it } from "vitest";
import { formatPhone, isValidTaxId, normalizePhone, parseMoneyToCents, slugify } from "./format";

describe("format", () => {
  it("valida CPF e CNPJ", () => {
    expect(isValidTaxId("529.982.247-25")).toBe(true);
    expect(isValidTaxId("529.982.247-24")).toBe(false);
    expect(isValidTaxId("111.111.111-11")).toBe(false);
    expect(isValidTaxId("11.222.333/0001-81")).toBe(true);
    expect(isValidTaxId("11.222.333/0001-80")).toBe(false);
    expect(isValidTaxId("123")).toBe(false);
  });
  it("telefone, dinheiro e slug", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
    expect(formatPhone("5511987654321")).toBe("(11) 98765-4321");
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("40")).toBe(4000);
    expect(slugify("Salão Beleza Pura!")).toBe("salao-beleza-pura");
  });
});
