import "server-only";
import { db } from "./db";
import { slugify } from "./format";
import { slugCandidates, slugProblem } from "./slug";
import { businessTypeInfo } from "./business-types";

export type SlugCheck = { slug: string; available: boolean; message: string | null; suggestions: string[] };

/** Verifica se o link está livre e, se não estiver, sugere até 3 alternativas livres. */
export async function checkSlug(value: string, opts: { businessId?: string; businessType?: string; extraWords?: string[] } = {}): Promise<SlugCheck> {
  const slug = slugify(value);
  const problem = slugProblem(slug);
  let message = problem;
  if (!problem) {
    const taken = await db.business.findFirst({ where: { slug, ...(opts.businessId ? { id: { not: opts.businessId } } : {}) }, select: { id: true } });
    if (taken) message = "Este link já está em uso por outro estabelecimento.";
  }
  if (!message) return { slug, available: true, message: null, suggestions: [] };

  const candidates = slugCandidates(value, businessTypeInfo(opts.businessType).slugWord, opts.extraWords);
  const used = new Set(
    (await db.business.findMany({ where: { slug: { in: candidates } }, select: { slug: true } })).map((b) => b.slug),
  );
  return { slug, available: false, message, suggestions: candidates.filter((c) => !used.has(c)).slice(0, 3) };
}

/** Sugestões de link livres a partir do nome do estabelecimento (para o dono só tocar e escolher). */
export async function suggestSlugs(name: string, businessType: string, businessId: string, limit = 3): Promise<string[]> {
  const base = slugify(name).slice(0, 30).replace(/-+$/, "");
  if (!base) return [];
  const word = businessTypeInfo(businessType).slugWord;
  const candidates = [...new Set([base, ...slugCandidates(name, word)])].filter((s) => !slugProblem(s));
  const used = new Set(
    (await db.business.findMany({ where: { slug: { in: candidates }, id: { not: businessId } }, select: { slug: true } })).map((b) => b.slug),
  );
  return candidates.filter((c) => !used.has(c)).slice(0, limit);
}
