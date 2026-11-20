import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { confirmPixPayment, getPixProvider } from "@/lib/pix";

// Webhook do provedor Pix (SyncPay): confirma o pagamento e libera a assinatura.
export async function POST(req: NextRequest) {
  const provider = getPixProvider();
  if (!provider) return NextResponse.json({ error: "Pix não configurado" }, { status: 503 });

  const rawBody = await req.text();
  const result = await provider.parseWebhook(rawBody, req.headers);
  if (!result) return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });

  if (result.status === "PAID") {
    await confirmPixPayment(result.externalId);
  } else if (result.status === "EXPIRED" || result.status === "FAILED") {
    await db.payment.updateMany({
      where: { externalId: result.externalId, status: "PENDING" },
      data: { status: result.status },
    });
  }
  return NextResponse.json({ received: true });
}
