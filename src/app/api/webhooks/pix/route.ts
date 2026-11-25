import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { confirmPixPayment, getPixProvider } from "@/lib/pix";

// Webhook do provedor Pix (SyncPay): confirma o pagamento e libera a assinatura.
export async function POST(req: NextRequest) {
  const provider = getPixProvider();
  if (!provider?.parseWebhook) return NextResponse.json({ error: "Pix não configurado" }, { status: 503 });

  const rawBody = await req.text();
  const result = await provider.parseWebhook(rawBody, req.headers);
  if (!result) return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });

  if (result.status === "PAID") {
    await confirmPixPayment(result.externalId);
  } else if (result.status === "REFUNDED") {
    // Estornado/contestado: registra para o time revisar (o acesso já liberado não é retirado automaticamente)
    const p = await db.payment.findUnique({ where: { externalId: result.externalId } });
    if (p && p.status !== "REFUNDED") {
      await db.payment.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
      console.warn(`[pix] pagamento ${p.id} (estabelecimento ${p.businessId}) foi estornado/contestado`);
    }
  } else if (result.status === "EXPIRED" || result.status === "FAILED") {
    await db.payment.updateMany({
      where: { externalId: result.externalId, status: "PENDING" },
      data: { status: result.status },
    });
  }
  return NextResponse.json({ received: true });
}
