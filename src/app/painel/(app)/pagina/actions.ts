"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { isHexColor } from "@/lib/brand-colors";
import { instagramHandle, safeHttpsUrl } from "@/lib/links";

export type BrandingState = { error?: string | null; success?: string | null } | undefined;

export async function saveBranding(_: BrandingState, formData: FormData): Promise<BrandingState> {
  const user = await requireActiveUser();
  const text = (k: string, max: number) => String(formData.get(k) ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max) || null;

  const color = String(formData.get("brandColor") ?? "");
  if (color && !isHexColor(color)) return { error: "Cor inválida." };

  const igRaw = text("instagram", 120);
  const instagram = instagramHandle(igRaw);
  if (igRaw && !instagram) return { error: "Instagram inválido. Use o @ do perfil, ex.: @suabarbearia." };

  const mapsRaw = text("mapsUrl", 500);
  const mapsUrl = safeHttpsUrl(mapsRaw);
  if (mapsRaw && !mapsUrl) return { error: "Link do Google Maps inválido. Copie o link pelo botão Compartilhar do Maps." };

  const reviewRaw = text("reviewUrl", 500);
  const reviewUrl = safeHttpsUrl(reviewRaw);
  if (reviewRaw && !reviewUrl) return { error: "Link de avaliação inválido." };

  await db.business.update({
    where: { id: user.businessId },
    data: {
      brandColor: color ? color.toUpperCase() : null,
      tagline: text("tagline", 80),
      description: text("description", 300),
      instagram,
      mapsUrl,
      reviewUrl,
    },
  });
  revalidatePath(`/${user.business.slug}`);
  revalidatePath("/painel/pagina");
  return { success: "Página salva! Já está assim para os seus clientes." };
}

export async function removeImage(formData: FormData) {
  const user = await requireActiveUser();
  const field = formData.get("kind") === "capa" ? "coverImageId" : "logoImageId";
  const id = user.business[field];
  if (id) {
    await db.business.update({ where: { id: user.businessId }, data: { [field]: null } });
    await db.businessImage.deleteMany({ where: { id, businessId: user.businessId } });
  }
  revalidatePath(`/${user.business.slug}`);
  revalidatePath("/painel/pagina");
}
