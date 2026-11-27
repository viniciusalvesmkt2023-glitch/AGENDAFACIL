import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { checkSlug } from "@/lib/slug-check";

// Verifica se um link de agendamento está disponível (usado enquanto o dono digita)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const value = new URL(req.url).searchParams.get("s") ?? "";
  const business = await db.business.findUnique({ where: { id: session.businessId }, select: { businessType: true, address: true, district: true, city: true } });
  // Usa o bairro/cidade do endereço como ideia de sugestão (ex.: barbearia-do-joao-centro)
  const extraWords = business?.city
    ? [business.district, business.city].filter((p): p is string => !!p)
    : (business?.address ?? "").split(/[,-]/).map((p) => p.trim()).filter((p) => p && !/\d/.test(p)).slice(-2);
  const result = await checkSlug(value.slice(0, 80), { businessId: session.businessId, businessType: business?.businessType, extraWords });
  return NextResponse.json(result);
}
