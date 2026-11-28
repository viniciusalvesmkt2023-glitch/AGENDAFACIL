import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { isPlanId, PLANS } from "@/lib/plans";
import { getPixProvider } from "@/lib/pix";
import { PixScreen } from "./pix-screen";
import "./pix.css";

type Props = { params: Promise<{ id: string }> };

export default async function PixPaymentPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  let payment = await db.payment.findFirst({ where: { id, businessId: user.businessId, method: "PIX" } });
  if (!payment) notFound();
  // Cobrança gerada pela renovação automática da Asaas: busca o código Pix na primeira visita
  if (!payment.pixCopyPaste && payment.status === "PENDING" && payment.externalId) {
    const provider = getPixProvider();
    if (provider?.name === payment.provider && provider.getPixCode) {
      const code = await provider.getPixCode(payment.externalId).catch(() => null);
      if (code) {
        payment = await db.payment.update({
          where: { id },
          data: { pixCopyPaste: code.copyPaste, pixQrCode: code.qrCode, expiresAt: code.expiresAt },
        });
      }
    }
  }
  if (!payment.pixCopyPaste) notFound();

  // QR code gerado aqui a partir do copia e cola, com correção de erros máxima (aguenta a logo no meio e a animação por cima)
  const qrSvg = await QRCode.toString(payment.pixCopyPaste, { type: "svg", errorCorrectionLevel: "H", margin: 0, color: { dark: "#0c0c0e", light: "#ffffff" } });
  const plan = isPlanId(payment.plan) ? PLANS[payment.plan] : null;
  const expired = payment.status === "EXPIRED" || (payment.status === "PENDING" && !!payment.expiresAt && payment.expiresAt < new Date());

  return (
    <div className="px">
      <Link href="/painel/assinatura" className="px-back"><ArrowLeft /> Voltar para assinatura</Link>
      <PixScreen
        id={payment.id}
        initialStatus={expired ? "EXPIRED" : payment.status}
        amount={formatMoney(payment.amountCents)}
        planName={plan?.name ?? "HoraBoa"}
        months={plan?.months ?? 1}
        code={payment.pixCopyPaste}
        qrSvg={qrSvg}
        expiresAt={payment.expiresAt?.toISOString() ?? null}
        createdAt={payment.createdAt.toISOString()}
        recurring={payment.provider === "ASAAS"}
        validUntil={user.business.currentPeriodEnd?.toISOString() ?? null}
      />
    </div>
  );
}
