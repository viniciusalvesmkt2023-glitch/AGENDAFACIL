import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { hasAccess } from "./subscription";

const COOKIE_NAME = "agendafacil_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET não configurado (mínimo 16 caracteres). Veja .env.example.");
  }
  return new TextEncoder().encode(secret);
}

type SessionPayload = { userId: string; businessId: string };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.businessId !== "string") return null;
    return { userId: payload.userId, businessId: payload.businessId };
  } catch {
    return null;
  }
}

/** Retorna o usuário logado e seu estabelecimento, ou redireciona para o login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { business: true },
  });
  if (!user || user.businessId !== session.businessId) redirect("/entrar");
  return user;
}

/** Igual a requireUser, mas exige teste grátis ou assinatura ativa. */
export async function requireActiveUser() {
  const user = await requireUser();
  if (!hasAccess(user.business)) redirect("/painel/assinatura");
  return user;
}
