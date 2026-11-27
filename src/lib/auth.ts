import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hasAccess } from "./subscription";
import { COOKIE_NAME, cookieOptions, readSession, signSession } from "./session-token";

type NewSession = { userId: string; businessId: string; sessionVersion: number; remember?: boolean };

/** Entra na conta neste aparelho. Com "manter conectado" (padrão) o login fica salvo por 180 dias. */
export async function createSession({ userId, businessId, sessionVersion, remember = true }: NewSession) {
  const token = await signSession({ userId, businessId, v: sessionVersion, remember });
  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions(remember));
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Lê o login do cookie (sem olhar o banco). */
async function readCookie() {
  const store = await cookies();
  return readSession(store.get(COOKIE_NAME)?.value);
}

/** Login válido: o token confere e a senha não foi trocada depois dele (troca de senha desconecta os outros aparelhos). */
export async function getSession(): Promise<{ userId: string; businessId: string; remember: boolean } | null> {
  const s = await readCookie();
  if (!s) return null;
  const u = await db.user.findUnique({ where: { id: s.userId }, select: { businessId: true, sessionVersion: true } });
  if (!u || u.businessId !== s.businessId || u.sessionVersion !== s.v) return null;
  return { userId: s.userId, businessId: s.businessId, remember: s.remember };
}

/** Usuário logado (ou null), já com o estabelecimento. */
export async function getCurrentUser() {
  const s = await readCookie();
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.userId }, include: { business: true } });
  if (!user || user.businessId !== s.businessId || user.sessionVersion !== s.v) return null;
  return user;
}

/** Retorna o usuário logado e seu estabelecimento, ou redireciona para o login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** Igual a requireUser, mas exige teste grátis ou assinatura ativa. */
export async function requireActiveUser() {
  const user = await requireUser();
  if (!hasAccess(user.business)) redirect("/painel/assinatura");
  return user;
}
