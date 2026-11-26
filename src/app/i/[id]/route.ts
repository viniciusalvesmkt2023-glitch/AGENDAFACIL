import { db } from "@/lib/db";

// Imagens da página pública (logo e capa). Cada imagem tem um id novo a cada envio,
// então o conteúdo nunca muda e pode ficar em cache "para sempre".
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await db.businessImage.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!img) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
