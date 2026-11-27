import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, cookieOptions, needsRenewal, readSession, signSession } from "@/lib/session-token";

/**
 * Login salvo "deslizante": enquanto a pessoa usa o painel, o login é renovado
 * (mais 180 dias a partir de hoje), então quem usa sempre nunca precisa digitar a senha de novo.
 */
export async function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return res;
  const s = await readSession(token);
  if (!s || !needsRenewal(s.iat, s.remember)) return res;
  const fresh = await signSession({ userId: s.userId, businessId: s.businessId, v: s.v, remember: s.remember });
  res.cookies.set(COOKIE_NAME, fresh, cookieOptions(s.remember));
  return res;
}

export const config = {
  // só as telas de quem está logado (o resto do site não precisa)
  matcher: ["/painel/:path*", "/comecar/:path*", "/admin/:path*"],
};
