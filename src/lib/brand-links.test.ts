import { describe, expect, it } from "vitest";
import { brandPalette, contrast, DEFAULT_BRAND } from "./brand-colors";
import { directionsUrl, instagramHandle, safeHttpsUrl } from "./links";

describe("cores da página", () => {
  it("botões sempre legíveis com texto branco", () => {
    for (const hex of ["#C9A227", "#FDE047", "#22D3EE", "#E85F00", "#18181B"]) {
      expect(contrast(brandPalette(hex)["--color-brand-600"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("cor inválida usa o padrão", () => {
    expect(brandPalette("vermelho")["--color-brand-500"]).toBe(DEFAULT_BRAND.toLowerCase());
  });
});

describe("links", () => {
  it("instagram aceita @, nome e link", () => {
    expect(instagramHandle("@barber.top")).toBe("barber.top");
    expect(instagramHandle("https://www.instagram.com/barber_top/?hl=pt")).toBe("barber_top");
    expect(instagramHandle("barber top")).toBeNull();
    expect(instagramHandle("")).toBeNull();
  });
  it("como chegar: link do Maps ou busca pelo endereço", () => {
    expect(directionsUrl("https://maps.app.goo.gl/abc", "Rua X")).toBe("https://maps.app.goo.gl/abc");
    expect(directionsUrl(null, "Rua Santana Soares, 102")).toContain("query=Rua%20Santana%20Soares%2C%20102");
    expect(directionsUrl(null, null)).toBeNull();
  });
  it("só links https", () => {
    expect(safeHttpsUrl("g.page/r/abc/review")).toBe("https://g.page/r/abc/review");
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("http://site.com")).toBeNull();
  });
});
