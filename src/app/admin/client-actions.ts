"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { cancelAccessData, extendAccessData, grantPlanData } from "@/lib/admin-billing";
import { getStripe } from "@/lib/stripe";
import { cancelAsaasSubscription } from "@/lib/pix/asaas-billing";
import { PLANS, isPlanId } from "@/lib/plans";
import { formatMoney } from "@/lib/format";

export type ClientActionState = { error?: string; success?: string } | undefined;

const fmtDate = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);

async function load(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const b = await db.business.findUnique({ where: { id } });
  return { admin, b };
}
function done(id: string) {
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin");
}

/** Estender o acesso do cliente por alguns dias (teste grátis ou período pago). */
export async function extendAccess(_: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const { admin, b } = await load(formData);
  if (!b) return { error: "Cliente não encontrado." };
  const days = Number(formData.get("days"));
  if (!Number.isInteger(days) || days < 1 || days > 730) return { error: "Escolha de 1 a 730 dias." };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const ext = extendAccessData(b, days);
  await db.business.update({ where: { id: b.id }, data: ext.data });
  const until = ext.until;
  const what = ext.kind === "trial" ? "teste grátis" : "acesso";
  await db.adminAction.create({
    data: { businessId: b.id, adminEmail: admin.email, action: "EXTEND", detail: `+${days} dias de ${what} (até ${fmtDate(until)})${reason ? ` · ${reason}` : ""}` },
  });
  done(b.id);
  return { success: `Pronto: +${days} dias de ${what}, até ${fmtDate(until)}.` };
}

/** Ativar um plano manualmente (ex.: pagou por fora). Pode registrar a venda. */
export async function grantPlan(_: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const { admin, b } = await load(formData);
  if (!b) return { error: "Cliente não encontrado." };
  const plan = String(formData.get("plan"));
  if (!isPlanId(plan)) return { error: "Escolha um plano." };
  const p = PLANS[plan];
  const record = formData.get("record") === "on";
  const data = grantPlanData(b, plan, p.months);
  await db.$transaction([
    db.business.update({ where: { id: b.id }, data }),
    ...(record
      ? [db.payment.create({ data: { businessId: b.id, provider: "MANUAL", method: "OTHER", plan, amountCents: p.priceCents, status: "PAID", paidAt: new Date() } })]
      : []),
    db.adminAction.create({
      data: { businessId: b.id, adminEmail: admin.email, action: "GRANT_PLAN", detail: `Plano ${p.name} ativado até ${fmtDate(data.currentPeriodEnd)}${record ? ` · venda de ${formatMoney(p.priceCents)} registrada` : ""}` },
    }),
  ]);
  done(b.id);
  return { success: `Plano ${p.name} ativo até ${fmtDate(data.currentPeriodEnd)}.` };
}

/** Cancelar o acesso na hora (ex.: reembolso). Para as cobranças no cartão e no Pix. */
export async function cancelAccess(_: ClientActionState, formData: FormData): Promise<ClientActionState> {
  const { admin, b } = await load(formData);
  if (!b) return { error: "Cliente não encontrado." };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "CANCELAR") return { error: "Digite CANCELAR para confirmar." };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!reason) return { error: "Escreva o motivo (fica no histórico)." };
  const refund = formData.get("refund") === "on";

  // Para as cobranças antes de cortar o acesso (se falhar, não corta, para não ficar cobrando sem acesso)
  try {
    const stripe = getStripe();
    if (stripe && b.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(b.stripeSubscriptionId).catch((e: { code?: string }) => {
        if (e?.code !== "resource_missing") throw e;
      });
    }
    if (b.asaasSubscriptionId) await cancelAsaasSubscription(b, true);
  } catch (e) {
    console.error("[admin] erro ao cancelar assinatura", e);
    return { error: "Não consegui cancelar a cobrança no Stripe/Asaas agora. Nada foi alterado; tente de novo em alguns minutos." };
  }

  let refunded = "";
  if (refund) {
    const last = await db.payment.findFirst({ where: { businessId: b.id, status: "PAID" }, orderBy: { paidAt: "desc" } });
    if (last) {
      await db.payment.update({ where: { id: last.id }, data: { status: "REFUNDED" } });
      refunded = ` · último pagamento (${formatMoney(last.amountCents)}) marcado como reembolsado`;
    }
  }
  await db.business.update({ where: { id: b.id }, data: cancelAccessData(b) });
  await db.adminAction.create({ data: { businessId: b.id, adminEmail: admin.email, action: "CANCEL", detail: `Acesso cancelado · ${reason}${refunded}` } });
  done(b.id);
  return { success: `Acesso cancelado${refund ? " e reembolso registrado" : ""}. As cobranças automáticas foram encerradas.` };
}
