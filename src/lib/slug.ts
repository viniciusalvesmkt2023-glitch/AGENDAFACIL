import { slugify } from "./format";
import { RESERVED_SLUGS } from "./brand";

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** Problema com o formato do link (ou null se estiver ok). Não verifica se já está em uso. */
export function slugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `O link precisa ter pelo menos ${SLUG_MIN} letras.`;
  if (slug.length > SLUG_MAX) return `O link pode ter no máximo ${SLUG_MAX} caracteres.`;
  if (RESERVED_SLUGS.has(slug)) return "Este link é reservado pelo sistema.";
  return null;
}

/** Links alternativos para sugerir quando o desejado já está em uso (em ordem de preferência). */
export function slugCandidates(value: string, typeWord: string, extraWords: string[] = []): string[] {
  const base = slugify(value).slice(0, SLUG_MAX - 10).replace(/-+$/, "");
  if (!base) return [];
  const list: string[] = [];
  if (!base.includes(typeWord)) list.push(`${typeWord}-${base}`);
  for (const w of extraWords) {
    const word = slugify(w);
    if (word && !base.includes(word)) list.push(`${base}-${word}`);
  }
  list.push(`${base}-oficial`);
  if (typeWord !== "studio" && !base.includes("studio")) list.push(`${base}-studio`);
  for (let i = 2; i <= 9; i++) list.push(`${base}${i}`);
  return [...new Set(list)].filter((s) => s !== base && !slugProblem(s));
}
