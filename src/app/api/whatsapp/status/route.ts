import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getConnectedNumber, getConnectionState, getQrCode } from "@/lib/evolution";

// Status da conexão do WhatsApp do estabelecimento logado.
// Enquanto não conecta, devolve o QR code atualizado (ele muda a cada ~30 segundos).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const business = await db.business.findUnique({ where: { id: session.businessId } });
  if (!business?.whatsappInstance) return NextResponse.json({ status: "DISCONNECTED" });

  const name = business.whatsappInstance;
  try {
    const state = await getConnectionState(name);
    if (state === "open") {
      if (business.whatsappStatus !== "CONNECTED") {
        await db.business.update({
          where: { id: business.id },
          data: { whatsappStatus: "CONNECTED", whatsappConnectedAt: new Date(), whatsappNumber: await getConnectedNumber(name) },
        });
      }
      return NextResponse.json({ status: "CONNECTED" });
    }
    const qr = await getQrCode(name);
    const image = qr.image ?? (qr.code ? await QRCode.toDataURL(qr.code, { margin: 1, width: 280 }) : null);
    if (business.whatsappStatus === "CONNECTED") {
      await db.business.update({ where: { id: business.id }, data: { whatsappStatus: "CONNECTING" } });
    }
    return NextResponse.json({ status: "CONNECTING", qr: image, pairingCode: qr.pairingCode });
  } catch (e) {
    console.error("[whatsapp] erro ao consultar status", e);
    return NextResponse.json({ status: "ERROR", error: "Servidor de WhatsApp indisponível no momento." });
  }
}
