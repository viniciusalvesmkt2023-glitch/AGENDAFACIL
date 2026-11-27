"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { setSetting } from "@/lib/site-settings";
import { youtubeId } from "@/lib/youtube";

export type AdminState = { error?: string; success?: string; value?: string } | undefined;

/** Salva o link do vídeo do popup "Ver como funciona". */
export async function saveVideoSetting(_: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const value = String(formData.get("video") ?? "").trim();
  if (!youtubeId(value)) return { error: "Cole um link de vídeo do YouTube (ex.: https://youtu.be/ABC123xyz00).", value };
  await setSetting("howItWorksVideo", value);
  revalidatePath("/");
  return { success: "Vídeo salvo. Já está no popup \"Ver como funciona\" da página de vendas.", value };
}
