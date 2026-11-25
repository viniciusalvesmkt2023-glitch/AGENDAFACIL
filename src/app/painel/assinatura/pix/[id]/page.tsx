import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { isPlanId, PLANS } from "@/lib/plans";
import { CopyButton } from "@/components/copy-button";
import { PixStatus } from "./pix-status";
import { getPixProvider } from "@/lib/pix";

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

  const qr = payment.pixQrCode || (await QRCode.toDataURL(payment.pixCopyPaste, { margin: 1, width: 280 }));
  const qrSrc = qr.startsWith("data:") || qr.startsWith("http") ? qr : `data:image/png;base64,${qr}`;
  const plan = isPlanId(payment.plan) ? PLANS[payment.plan] : null;

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 text-center">
        <h1 className="text-xl font-semibold">Pague com Pix</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Plano {plan?.name} · <strong>{formatMoney(payment.amountCents)}</strong>
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="QR code Pix" className="mx-auto my-6 h-64 w-64" />
        <p className="text-sm text-zinc-600">Abra o app do seu banco, escolha Pix e leia o QR code, ou use o código copia e cola:</p>
        <div className="mt-3 break-all rounded-lg bg-zinc-50 p-3 text-left font-mono text-xs text-zinc-600">{payment.pixCopyPaste}</div>
        <div className="mt-3">
          <CopyButton value={payment.pixCopyPaste} label="Copiar código Pix" />
        </div>
        <div className="mt-6">
          <PixStatus id={payment.id} initialStatus={payment.status} />
        </div>
      </div>
      <Link href="/painel/assinatura" className="mt-4 block text-center text-sm text-zinc-500 hover:underline">
        Voltar para assinatura
      </Link>
    </div>
  );
}
