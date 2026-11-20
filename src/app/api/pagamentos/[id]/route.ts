import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { confirmPixPayment, getPixProvider } from "@/lib/pix";

// Status de um pagamento Pix (consultado pela tela do QR code a cada poucos segundos)
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  let payment = await db.payment.findFirst({ where: { id, businessId: session.businessId } });
  if (!payment) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (payment.status === "PENDING" && payment.externalId) {
    // Reserva: se o webhook atrasar, pergunta direto ao provedor
    const provider = getPixProvider();
    const status = provider?.getStatus ? await provider.getStatus(payment.externalId).catch(() => null) : null;
    if (status === "PAID") {
      await confirmPixPayment(payment.externalId);
    } else if (payment.expiresAt && payment.expiresAt < new Date()) {
      await db.payment.update({ where: { id }, data: { status: "EXPIRED" } });
    }
    payment = await db.payment.findUniqueOrThrow({ where: { id } });
  }
  return NextResponse.json({ status: payment.status });
}
