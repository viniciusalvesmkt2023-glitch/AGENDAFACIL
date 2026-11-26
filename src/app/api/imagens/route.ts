import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/images";

const KINDS = { logo: "LOGO", capa: "COVER" } as const;

// POST /api/imagens  (multipart: kind=logo|capa, file)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const kindKey = String(form?.get("kind") ?? "") as keyof typeof KINDS;
  const file = form?.get("file");
  if (!(kindKey in KINDS) || !(file instanceof Blob)) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Imagem muito grande. Tente outra foto." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return NextResponse.json({ error: "Use uma imagem JPG, PNG ou WebP." }, { status: 415 });

  const kind = KINDS[kindKey];
  const field = kind === "LOGO" ? "logoImageId" : "coverImageId";
  const business = await db.business.findUnique({ where: { id: session.businessId }, select: { id: true, slug: true, logoImageId: true, coverImageId: true } });
  if (!business) return NextResponse.json({ error: "Estabelecimento não encontrado." }, { status: 404 });

  const img = await db.businessImage.create({ data: { businessId: business.id, kind, mime, data: Buffer.from(bytes) } });
  await db.business.update({ where: { id: business.id }, data: { [field]: img.id } });
  // Apaga a imagem anterior
  const old = business[field];
  if (old) await db.businessImage.deleteMany({ where: { id: old, businessId: business.id } });

  revalidatePath(`/${business.slug}`);
  return NextResponse.json({ id: img.id, url: `/i/${img.id}` });
}
