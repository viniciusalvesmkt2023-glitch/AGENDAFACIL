import { db } from "./db";

// Configurações gerais do site, editadas no painel admin.
export const SETTINGS = {
  /** Link do vídeo do popup "Ver como funciona" da página de vendas. */
  howItWorksVideo: { key: "how_it_works_video", fallback: "https://youtu.be/GhyZV0YarBM" },
} as const;

export type SettingName = keyof typeof SETTINGS;

export async function getSetting(name: SettingName): Promise<string> {
  const { key, fallback } = SETTINGS[name];
  const row = await db.siteSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(name: SettingName, value: string) {
  const { key } = SETTINGS[name];
  await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
