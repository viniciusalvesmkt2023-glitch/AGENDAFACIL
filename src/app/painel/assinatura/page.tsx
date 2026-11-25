import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAccessState } from "@/lib/subscription";
import { monthlyEquivalentCents, PLAN_LIST, PLANS, isPlanId } from "@/lib/plans";
import { formatMoney } from "@/lib/format";
import { ensureStripeSubscriptionExists, getStripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { getPixProvider } from "@/lib/pix";
import { PageHeader } from "@/components/ui";
import { PlanPicker } from "./plan-picker";
import { cancelPixSubscription, openCardPortal } from "./actions";

type Props = { searchParams: Promise<{ sucesso?: string; erro?: string; cancelado?: string }> };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

const PAYMENT_STATUS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Aguardando",
  EXPIRED: "Expirado",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

export default async function SubscriptionPage({ searchParams }: Props) {
  const user = await requireUser();
  const { sucesso, erro, cancelado } = await searchParams;
  const b = user.business;
  // Assinatura de cartão que não existe mais na Stripe (ex.: era do modo de teste) é limpa automaticamente
  if (b.paymentMethod === "CARD" && !(await ensureStripeSubscriptionExists(b))) redirect("/painel/assinatura");
  const state = getAccessState(b);
  const payments = await db.payment.findMany({
    where: { businessId: b.id, status: { in: ["PAID", "PENDING"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const currentPlan = isPlanId(b.plan) ? PLANS[b.plan] : null;
  const hasCardSubscription = b.paymentMethod === "CARD" && !!b.stripeSubscriptionId && b.subscriptionStatus === "ACTIVE";

  return (
    <>
      <PageHeader title="Assinatura" description="Seu plano e seus pagamentos." />

      {sucesso && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Pagamento recebido! Sua assinatura será ativada em instantes. Se o status ainda não mudou, recarregue a página.
        </div>
      )}

      {cancelado && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          Assinatura Pix cancelada. Nenhuma nova cobrança será gerada; seu acesso continua até o fim do período já pago.
        </div>
      )}
      {erro === "cancelar" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Não foi possível cancelar agora. Tente novamente em alguns minutos ou fale com o suporte.
        </div>
      )}
      {erro === "portal" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Não foi possível abrir o gerenciamento do cartão agora. Tente novamente em alguns minutos ou fale com o suporte.
        </div>
      )}

      <section className="card mb-8 p-5">
        {state.kind === "trial" && (
          <p>
            Você está no <strong>teste grátis</strong>: {state.daysLeft === 1 ? "último dia" : `faltam ${state.daysLeft} dias`}{" "}
            (até {dateFmt.format(b.trialEndsAt)}). Assine para continuar recebendo agendamentos depois disso.
          </p>
        )}
        {state.kind === "active" && (
          <p>
            Assinatura <strong className="text-emerald-700">ativa</strong>
            {currentPlan && <> — plano {currentPlan.name}</>}
            {b.paymentMethod === "PIX" ? " (Pix)" : b.paymentMethod === "CARD" ? " (cartão)" : ""}.{" "}
            {b.currentPeriodEnd &&
              (b.subscriptionStatus === "CANCELED" || b.paymentMethod === "PIX"
                ? `Válida até ${dateFmt.format(b.currentPeriodEnd)}.`
                : `Próxima cobrança em ${dateFmt.format(b.currentPeriodEnd)}.`)}
          </p>
        )}
        {state.kind === "grace" && (
          <p className="text-amber-700">
            Sua assinatura venceu. Você ainda tem <strong>{state.daysLeft} dia(s)</strong> de tolerância antes do bloqueio. Regularize abaixo.
          </p>
        )}
        {state.kind === "blocked" && (
          <p className="text-red-700">
            {state.reason === "trial_ended" ? "Seu teste grátis terminou." : "Sua assinatura não está ativa."} O painel e a
            sua página de agendamento estão bloqueados. Escolha um plano para reativar — seus dados continuam salvos.
          </p>
        )}
        {b.asaasSubscriptionId && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600">
              Assinatura Pix com <strong>renovação automática</strong>: a cobrança de cada período é gerada
              sozinha. Se você autorizou o <strong>Pix Automático</strong> no seu banco, ela é debitada no vencimento.
            </p>
            <form action={cancelPixSubscription}>
              <button className="btn-secondary">Cancelar assinatura Pix</button>
            </form>
          </div>
        )}
        {hasCardSubscription && (
          <form action={openCardPortal} className="mt-4">
            <button className="btn-secondary">Gerenciar cartão / cancelar</button>
          </form>
        )}
      </section>

      {!hasCardSubscription && (
        <>
          <h2 className="mb-4 text-lg font-semibold">
            {state.kind === "active" ? "Renovar ou trocar de plano" : "Escolha seu plano"}
          </h2>
          <PlanPicker
            cardEnabled={!!getStripe()}
            pixEnabled={!!getPixProvider()}
            pixRecurring={getPixProvider()?.name === "ASAAS"}
            defaultTaxId={b.taxId ?? ""}
            defaultPhone={b.billingPhone ?? b.phone ?? ""}
            plans={PLAN_LIST.map((p) => ({
              id: p.id,
              name: p.name,
              months: p.months,
              price: formatMoney(p.priceCents),
              perMonth: formatMoney(monthlyEquivalentCents(p)),
              highlight: p.highlight,
            }))}
          />
        </>
      )}

      {payments.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Pagamentos</h2>
          <ul className="card divide-y divide-zinc-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  {dateFmt.format(p.paidAt ?? p.createdAt)} · Plano {isPlanId(p.plan) ? PLANS[p.plan].name : p.plan} ·{" "}
                  {p.method === "PIX" ? "Pix" : "Cartão"}
                </span>
                <span className="font-medium">
                  {formatMoney(p.amountCents)} · {PAYMENT_STATUS[p.status] ?? p.status}
                  {p.status === "PENDING" && p.method === "PIX" && (
                    <a href={`/painel/assinatura/pix/${p.id}`} className="ml-2 text-brand-700 underline">ver Pix</a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
