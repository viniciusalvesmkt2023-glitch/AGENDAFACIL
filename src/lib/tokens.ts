import { createHash, randomBytes } from "node:crypto";

/** Token aleatório seguro para links (ex.: redefinição de senha). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Guardamos só o hash no banco: se o banco vazar, os links continuam inúteis. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
