import { describe, expect, it } from "vitest";
import { stockState } from "./products";

describe("estoque", () => {
  it("situação", () => {
    expect(stockState(0, 3)).toBe("OUT");
    expect(stockState(-1, null)).toBe("OUT");
    expect(stockState(3, 3)).toBe("LOW");
    expect(stockState(2, 3)).toBe("LOW");
    expect(stockState(4, 3)).toBe("OK");
    expect(stockState(1, null)).toBe("OK");
  });
});
