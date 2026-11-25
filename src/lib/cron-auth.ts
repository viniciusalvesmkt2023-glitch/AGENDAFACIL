import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function matches(value: string | null): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  const received = value?.trim().replace(/^bearer\s+/i, "").trim();
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Chave no cabeçalho "Authorization: Bearer ..." (Vercel Cron) ou no endereço "?key=..." (cron-job.org). */
export function isCronAuthorized(req: NextRequest): boolean {
  return matches(req.headers.get("authorization")) || matches(req.nextUrl.searchParams.get("key"));
}
