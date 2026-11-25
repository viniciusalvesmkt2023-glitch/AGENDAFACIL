import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Status de um pagamento Pix (a tela do QR code consulta a cada poucos segundos).
// Só lê o nosso banco: a confirmação chega pelo webhook. A consulta ao provedor é feita
// pelo cron de contingência (a SyncPay limita a 5 consultas por cobrança).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const payment = await db.payment.findFirst({ where: { id, businessId: session.businessId } });
  if (!payment) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (payment.status === "PENDING" && payment.expiresAt && payment.expiresAt < new Date()) {
    await db.payment.update({ where: { id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ status: "EXPIRED" });
  }
  return NextResponse.json({ status: payment.status });
}
