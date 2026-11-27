// Aulas do HoraBoa: funções simples usadas no Suporte e no admin.

/** Aula publicada há menos de 14 dias ganha a etiqueta "Nova". */
export const NEW_DAYS = 14;

/** "5:20", "1:02:03" ou "320" (segundos) → segundos. Vazio ou inválido → null. */
export function parseDuration(input: string | null | undefined): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw) > 0 ? Number(raw) : null;
  const m = raw.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, h, min, s] = m;
  if (Number(s) > 59 || (h && Number(min) > 59)) return null;
  const total = Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s);
  return total > 0 ? total : null;
}

/** 320 → "5:20"; 3723 → "1:02:03". */
export function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function isNewLesson(publishedAt: Date | string | null | undefined, now = new Date()) {
  if (!publishedAt) return false;
  return now.getTime() - new Date(publishedAt).getTime() < NEW_DAYS * 86_400_000;
}

/** Próxima aula para "continue de onde parou": a primeira (na ordem) que ainda não foi assistida. */
export function nextLesson<T extends { id: string }>(ordered: T[], watched: Set<string>): T | null {
  return ordered.find((l) => !watched.has(l.id)) ?? null;
}

/** Capa do vídeo no YouTube. */
export const lessonThumb = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
