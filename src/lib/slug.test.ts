import { describe, expect, it } from "vitest";
import { slugCandidates, slugProblem } from "./slug";

describe("slugProblem", () => {
  it("rejeita curtos, longos e reservados", () => {
    expect(slugProblem("ab")).toMatch(/pelo menos/);
    expect(slugProblem("a".repeat(41))).toMatch(/no máximo/);
    expect(slugProblem("painel")).toMatch(/reservado/);
    expect(slugProblem("barbearia-do-joao")).toBeNull();
  });
});

describe("slugCandidates", () => {
  it("sugere com a palavra do tipo, bairro, oficial e números", () => {
    const c = slugCandidates("Do João", "barbearia", ["Centro"]);
    expect(c.slice(0, 3)).toEqual(["barbearia-do-joao", "do-joao-centro", "do-joao-oficial"]);
    expect(c).toContain("do-joao2");
    expect(c).not.toContain("do-joao");
  });
  it("não repete a palavra do tipo", () => {
    expect(slugCandidates("Barbearia Top", "barbearia")[0]).toBe("barbearia-top-oficial");
  });
});
