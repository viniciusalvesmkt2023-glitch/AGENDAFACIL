// Links da página pública: Instagram, Google Maps, avaliação.

/** Aceita "@perfil", "perfil" ou o link do perfil. Devolve só o nome do perfil (sem @). */
export function instagramHandle(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const fromUrl = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(v)?.[1];
  const handle = (fromUrl ?? v).replace(/^@/, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export const instagramUrl = (handle: string) => `https://instagram.com/${handle}`;

/** Link "Como chegar": o link do Maps informado ou uma busca pelo endereço. */
export function directionsUrl(mapsUrl: string | null | undefined, address: string | null | undefined): string | null {
  if (mapsUrl && /^https:\/\//i.test(mapsUrl)) return mapsUrl;
  if (address?.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  return null;
}

/** Só aceita links https (evita "javascript:" e afins). */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
