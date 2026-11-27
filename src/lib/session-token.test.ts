import { beforeAll, describe, expect, it } from "vitest";
import { cookieOptions, needsRenewal, readSession, signSession } from "./session-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "teste-segredo-com-mais-de-16";
});

describe("login salvo", () => {
  it("guarda e lê o token com versão e 'manter conectado'", async () => {
    const t = await signSession({ userId: "u1", businessId: "b1", v: 3, remember: false });
    const s = await readSession(t);
    expect(s).toMatchObject({ userId: "u1", businessId: "b1", v: 3, remember: false });
  });

  it("token inválido ou vazio não entra", async () => {
    expect(await readSession(undefined)).toBeNull();
    expect(await readSession("abc.def.ghi")).toBeNull();
  });

  it("manter conectado = cookie de 180 dias; sem = some ao fechar o navegador", () => {
    expect(cookieOptions(true).maxAge).toBe(180 * 24 * 60 * 60);
    expect("maxAge" in cookieOptions(false)).toBe(false);
  });

  it("renova o login salvo 1x por dia (e o curto a cada hora)", () => {
    const now = 1_000_000_000;
    expect(needsRenewal(now - 3600, true, now)).toBe(false);
    expect(needsRenewal(now - 25 * 3600, true, now)).toBe(true);
    expect(needsRenewal(now - 2 * 3600, false, now)).toBe(true);
  });
});
