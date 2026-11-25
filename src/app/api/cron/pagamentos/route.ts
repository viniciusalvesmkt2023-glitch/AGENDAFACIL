import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron-auth";
import { confirmPixPayment, getPixProvider } from "@/lib/pix";

// Contingência: se o webhook de algum Pix não chegou, consulta o status no provedor.
// Regras da SyncPay: só depois de 5 minutos da criação e no máximo 5 consultas por cobrança
// (usamos até 4, deixando uma de folga). Roda a cada 15 minutos.
export const maxDuration = 60;
const MAX_CHECKS = 4;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const provider = getPixProvider();
  if (!provider?.getStatus) return NextResponse.json({ skipped: "Pix não configurado" });

  const now = Date.now();
  const pending = await db.payment.findMany({
    where: {
      method: "PIX",
      provider: provider.name,
      status: "PENDING",
      externalId: { not: null },
      statusChecks: { lt: MAX_CHECKS },
      createdAt: { lt: new Date(now - 5 * 60_000), gt: new Date(now - 2 * 86_400_000) },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const results = { checked: 0, paid: 0, failed: 0, errors: 0 };
  for (const p of pending) {
    // Conta a consulta antes de fazer, para nunca passar do limite mesmo se der erro
    await db.payment.update({ where: { id: p.id }, data: { statusChecks: { increment: 1 } } });
    try {
      const status = await provider.getStatus(p.externalId!);
      results.checked++;
      if (status === "PAID") {
        await confirmPixPayment(p.externalId!);
        results.paid++;
      } else if (status === "FAILED" || status === "EXPIRED") {
        await db.payment.update({ where: { id: p.id }, data: { status } });
        results.failed++;
      }
    } catch (e) {
      results.errors++;
      console.warn(`[pix] contingência falhou para ${p.id}:`, (e as Error).message);
    }
  }
  return NextResponse.json({ pending: pending.length, ...results });
}
