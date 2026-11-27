import { SignJWT, jwtVerify } from "jose";

/** Token do login (usado pelo servidor e pelo proxy que renova o login salvo). */
export const COOKIE_NAME = "agendafacil_session";
/** "Manter conectado": o login dura 180 dias e renova sozinho enquanto a pessoa usa. */
export const REMEMBER_DAYS = 180;
/** Sem "manter conectado": some ao fechar o navegador (e vale no máximo 1 dia sem uso). */
export const SHORT_DAYS = 1;

export type SessionPayload = { userId: string; businessId: string; v: number; remember: boolean };

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET não configurado (mínimo 16 caracteres). Veja .env.example.");
  }
  return new TextEncoder().encode(secret);
}

export function signSession(p: SessionPayload) {
  return new SignJWT({ userId: p.userId, businessId: p.businessId, v: p.v, remember: p.remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${p.remember ? REMEMBER_DAYS : SHORT_DAYS}d`)
    .sign(getSecret());
}

export async function readSession(token: string | undefined): Promise<(SessionPayload & { iat: number }) | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.businessId !== "string") return null;
    return {
      userId: payload.userId,
      businessId: payload.businessId,
      v: typeof payload.v === "number" ? payload.v : 0,
      // logins feitos antes desta versão continuam salvos
      remember: payload.remember !== false,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

export function cookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // sem maxAge = cookie de sessão (apaga ao fechar o navegador)
    ...(remember ? { maxAge: REMEMBER_DAYS * 24 * 60 * 60 } : {}),
  };
}

/** Renova o token quando já passou um tempo desde a última renovação (login "deslizante"). */
export function needsRenewal(iat: number, remember: boolean, nowSec = Math.floor(Date.now() / 1000)) {
  return nowSec - iat > (remember ? 24 * 60 * 60 : 60 * 60);
}
