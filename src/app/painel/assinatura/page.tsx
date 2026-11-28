import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, CreditCard, Gift, GraduationCap, Lightbulb, MessageCircle, ReceiptText, ShieldCheck, Users, Wallet, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GRACE_DAYS, getAccessState, periodProgress } from "@/lib/subscription";
import { monthlyEquivalentCents, PLAN_LIST, PLANS, TRIAL_DAYS, isPlanId } from "@/lib/plans";
import { formatMoney, whatsappLink } from "@/lib/format";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { cardOnFile, ensureStripeSubscriptionExists, getStripe } from "@/lib/stripe";
import { getPixProvider } from "@/lib/pix";
import { BrandIcon, PageHeader } from "@/components/ui";
import { PlanPicker } from "./plan-picker";
import { cancelPixSubscription, openCardPortal } from "./actions";
import "./assinatura.css";

type Props = { searchParams: Promise<{ sucesso?: string; erro?: string; cancelado?: string }> };

const TZ = "America/Sao_Paulo";
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
const sinceFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: TZ });
const DAY = 86_400_000;

const PAYMENT_STATUS: Record<string, [string, string]> = {
  PAID: ["Pago", "paid"],
  PENDING: ["Aguardando", "pend"],
  REFUNDED: ["Estornado", "ref"],
};
const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", elo: "Elo", hipercard: "Hipercard", diners: "Diners" };
const UNIT: Record<number, string> = { 1: "/mês", 6: "/6 meses", 12: "/ano" };

const INCLUDED = [
  { icon: CalendarDays, text: "Agenda online e link de agendamento 24h" },
  { icon: MessageCircle, text: "Confirmação e lembretes no WhatsApp" },
  { icon: Users, text: "Profissionais ilimitados com horário e comissão" },
  { icon: Gift, text: "Cartão fidelidade automático" },
  { icon: Wallet, text: "Finanças, produtos e estoque" },
  { icon: GraduationCap, text: "Aulas e suporte em português" },
];

export default async function SubscriptionPage({ searchParams }: Props) {
  const user = await requireUser();
  const { sucesso, erro, cancelado } = await searchParams;
  const b = user.business;
  // Assinatura de cartão que não existe mais na Stripe (ex.: era do modo de teste) é limpa automaticamente
  if (b.paymentMethod === "CARD" && !(await ensureStripeSubscriptionExists(b))) redirect("/painel/assinatura");
  const state = getAccessState(b);
  const currentPlan = isPlanId(b.plan) ? PLANS[b.plan] : null;
  const hasCardSubscription = b.paymentMethod === "CARD" && !!b.stripeSubscriptionId && b.subscriptionStatus === "ACTIVE";
  const canceled = b.subscriptionStatus === "CANCELED";
  const [payments, card] = await Promise.all([
    db.payment.findMany({ where: { businessId: b.id, status: { in: ["PAID", "PENDING", "REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 12 }),
    hasCardSubscription ? cardOnFile(b.stripeSubscriptionId) : Promise.resolve(null),
  ]);
  const pendingPix = payments.find((p) => p.status === "PENDING" && p.method === "PIX");

  // Situação do cartão escuro
  const status =
    state.kind === "trial"
      ? { cls: "trial", label: "Teste grátis" }
      : state.kind === "active"
        ? canceled
          ? { cls: "warn", label: "Cancelada" }
          : { cls: "ok", label: "Ativa" }
        : state.kind === "grace"
          ? { cls: "bad", label: "Vencida" }
          : { cls: "bad", label: "Bloqueada" };
  const method =
    b.paymentMethod === "CARD"
      ? card
        ? `${BRANDS[card.brand] ?? "Cartão"} •••• ${card.last4}`
        : "Cartão de crédito"
      : b.paymentMethod === "PIX"
        ? b.asaasSubscriptionId
          ? "Pix (renova sozinho)"
          : "Pix"
        : "—";
  const since = sinceFmt.format(b.createdAt).replace(".", "");
  const meta: [string, string][] =
    state.kind === "trial"
      ? [
          ["Começou em", dateFmt.format(new Date(b.trialEndsAt.getTime() - TRIAL_DAYS * DAY))],
          ["Termina em", dateFmt.format(b.trialEndsAt)],
          ["Plano", "Tudo liberado"],
        ]
      : state.kind === "active"
        ? [
            ["Forma de pagamento", method],
            [canceled || b.paymentMethod === "PIX" ? "Válida até" : "Próxima cobrança", b.currentPeriodEnd ? dateFmt.format(b.currentPeriodEnd) : "—"],
            ["Cliente desde", since],
          ]
        : state.kind === "grace"
          ? [
              ["Forma de pagamento", method],
              ["Venceu em", b.currentPeriodEnd ? dateFmt.format(b.currentPeriodEnd) : "—"],
              ["Bloqueio em", b.currentPeriodEnd ? dateFmt.format(new Date(b.currentPeriodEnd.getTime() + GRACE_DAYS * DAY)) : "—"],
            ]
          : [
              ["Situação", state.reason === "trial_ended" ? "Teste grátis terminou" : "Assinatura inativa"],
              ["Seus dados", "Continuam salvos"],
              ["Cliente desde", since],
            ];
  const progress = state.kind === "active" && b.currentPeriodEnd && currentPlan ? periodProgress(b.currentPeriodEnd, currentPlan.months) : null;
  const annual = PLANS.ANNUAL;
  const yearlySaving = PLANS.MONTHLY.priceCents * 12 - annual.priceCents;
  const showUpsell = state.kind === "active" && !canceled && currentPlan?.id === "MONTHLY";
  const supportWhatsapp = process.env.SUPPORT_WHATSAPP;
  const upsellHref = hasCardSubscription
    ? supportWhatsapp
      ? whatsappLink(supportWhatsapp, `Olá! Quero mudar meu plano do HoraBoa para o Anual (${b.name}).`)
      : `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Mudar para o plano Anual: ${b.name}`)}`
    : "#planos";
  const trialPct = state.kind === "trial" ? Math.round((state.daysLeft / TRIAL_DAYS) * 100) : 0;

  return (
    <>
      <PageHeader title="Assinatura" description="Seu plano, a forma de pagamento e o histórico de cobranças." />

      {sucesso && (
        <div className="as-alert ok" role="status"><CheckCircle2 /><div><b>Pagamento recebido!</b>Sua assinatura é ativada em instantes. Se a situação ainda não mudou, recarregue a página.</div></div>
      )}
      {cancelado && (
        <div className="as-alert info" role="status"><CheckCircle2 /><div><b>Renovação cancelada.</b>Nenhuma nova cobrança será gerada. Seu acesso continua até o fim do período já pago.</div></div>
      )}
      {erro === "cancelar" && <div className="as-alert bad"><AlertTriangle /><div>Não foi possível cancelar agora. Tente de novo em alguns minutos ou fale com o suporte.</div></div>}
      {erro === "pix" && <div className="as-alert bad"><AlertTriangle /><div>Não foi possível gerar um novo Pix agora. Escolha o plano abaixo e tente de novo, ou fale com o suporte.</div></div>}
      {erro === "portal" && <div className="as-alert bad"><AlertTriangle /><div>Não foi possível abrir o gerenciamento do cartão agora. Tente de novo em alguns minutos ou fale com o suporte.</div></div>}
      {state.kind === "grace" && (
        <div className="as-alert warn"><AlertTriangle /><div><b>Sua assinatura venceu{b.currentPeriodEnd ? ` em ${dateFmt.format(b.currentPeriodEnd)}` : ""}.</b>Você ainda tem {state.daysLeft} dia{state.daysLeft === 1 ? "" : "s"} antes do bloqueio da agenda e do link. Pague abaixo para continuar.</div></div>
      )}
      {state.kind === "blocked" && (
        <div className="as-alert bad"><AlertTriangle /><div><b>{state.reason === "trial_ended" ? "Seu teste grátis terminou." : "Sua assinatura não está ativa."}</b>O painel e a sua página de agendamento estão bloqueados. Escolha um plano abaixo para reativar. Seus dados continuam salvos.</div></div>
      )}

      <div className="as-top">
        <section className={`as-plan ${status.cls === "bad" ? "bad" : ""}`} data-testid="plan-card">
          <div className="as-ph">
            <span className="as-logo"><BrandIcon className="" /></span>
            <div className="min-w-0"><small>HoraBoa</small><b>{state.kind === "trial" ? "Teste grátis" : currentPlan ? `Plano ${currentPlan.name}` : "Sem plano"}</b></div>
            <span className={`as-st ${status.cls}`}><i />{status.label}</span>
          </div>
          {state.kind === "trial" ? (
            <div className="as-trial">
              <span className="as-ring" style={{ "--p": `${trialPct}%` } as React.CSSProperties}><b>{state.daysLeft}</b></span>
              <div>
                <strong>{state.daysLeft === 1 ? "último dia de teste" : "dias de teste grátis"}</strong>
                <span>Tudo liberado até {dateFmt.format(b.trialEndsAt)}. Assine quando quiser, sem perder nada.</span>
              </div>
            </div>
          ) : currentPlan ? (
            <div className="as-price"><b>{formatMoney(currentPlan.priceCents)}</b><span>{UNIT[currentPlan.months] ?? `/${currentPlan.months} meses`}</span></div>
          ) : null}
          <div className="as-meta">
            {meta.map(([k, v]) => (
              <div key={k}><small>{k}</small><b title={v}>{v}</b></div>
            ))}
          </div>
          {progress && (
            <div className="as-per">
              <small><span>{canceled ? "Acesso até o fim do período" : "Período atual"}</span><span>{progress.daysLeft} dia{progress.daysLeft === 1 ? "" : "s"} restante{progress.daysLeft === 1 ? "" : "s"}</span></small>
              <div className="as-bar"><i style={{ width: `${progress.pct}%` }} /></div>
            </div>
          )}
          <div className="as-acts">
            {hasCardSubscription ? (
              <>
                <form action={openCardPortal}><input type="hidden" name="flow" value="card" /><button className="as-b1"><CreditCard /> Trocar cartão</button></form>
                <form action={openCardPortal}><button className="as-b2"><ReceiptText /> Ver faturas</button></form>
                <form action={openCardPortal}><input type="hidden" name="flow" value="cancel" /><button className="as-b3">Cancelar assinatura</button></form>
              </>
            ) : b.asaasSubscriptionId && !canceled ? (
              <>
                {pendingPix && <a className="as-b1" href={`/painel/assinatura/pix/${pendingPix.id}`}><Zap /> Pagar Pix pendente</a>}
                <form action={cancelPixSubscription}><button className="as-b3">Cancelar renovação</button></form>
              </>
            ) : (
              <a className="as-b1" href="#planos">{state.kind === "active" ? "Renovar ou trocar de plano ↓" : "Escolher plano ↓"}</a>
            )}
          </div>
        </section>

        <section className="as-inc">
          <h3>Tudo incluso no seu plano</h3>
          <p>Sem taxa por agendamento e sem limite de clientes.</p>
          <ul>
            {INCLUDED.map(({ icon: Icon, text }) => (
              <li key={text}><span><Icon /></span>{text}</li>
            ))}
          </ul>
          <div className="as-seal"><ShieldCheck /><span><b>Cancele quando quiser.</b> Sem multa e sem fidelidade. Seu acesso continua até o fim do período pago.</span></div>
        </section>
      </div>

      {showUpsell && (
        <div className="as-up">
          <span className="as-uic"><Lightbulb /></span>
          <div className="min-w-0">
            <b>Economize {formatMoney(yearlySaving)} por ano no plano Anual</b>
            <small>Sai por {formatMoney(monthlyEquivalentCents(annual))}/mês, cobrado uma vez por ano ({formatMoney(annual.priceCents)}).</small>
          </div>
          <a href={upsellHref} {...(upsellHref.startsWith("#") ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
            {hasCardSubscription ? "Quero mudar para o Anual" : "Mudar para o Anual"}
          </a>
        </div>
      )}

      {!hasCardSubscription && (
        <>
          <div className="as-sec" id="planos">
            <h2>{state.kind === "active" ? (canceled ? "Assinar de novo" : "Renovar ou trocar de plano") : "Escolha seu plano"}</h2>
            <span>Todos os planos têm tudo incluso</span>
          </div>
          <PlanPicker
            cardEnabled={!!getStripe()}
            pixEnabled={!!getPixProvider()}
            pixRecurring={getPixProvider()?.name === "ASAAS"}
            defaultTaxId={b.taxId ?? ""}
            defaultPhone={b.billingPhone ?? b.phone ?? ""}
            currentPlanId={state.kind === "active" ? currentPlan?.id : null}
            plans={PLAN_LIST.map((p) => {
              const save = PLANS.MONTHLY.priceCents * p.months - p.priceCents;
              return {
                id: p.id,
                name: p.name,
                months: p.months,
                price: formatMoney(p.priceCents),
                perMonth: formatMoney(monthlyEquivalentCents(p)),
                highlight: p.highlight,
                savings: save > 0 ? formatMoney(save) : undefined,
              };
            })}
          />
        </>
      )}

      {payments.length > 0 && (
        <>
          <div className="as-sec"><h2>Histórico de pagamentos</h2><span>Últimos {payments.length}</span></div>
          <div className="as-hist" data-testid="payments">
            {payments.map((p) => {
              const [label, cls] = PAYMENT_STATUS[p.status] ?? [p.status, "ref"];
              const Icon = p.method === "PIX" ? Zap : CreditCard;
              return (
                <div key={p.id} className="as-hr">
                  <span className="as-mi"><Icon /></span>
                  <div className="min-w-0">
                    <b>Plano {isPlanId(p.plan) ? PLANS[p.plan].name : p.plan}</b>
                    <small>{dateFmt.format(p.paidAt ?? p.createdAt)} · {p.method === "PIX" ? "Pix" : "Cartão"}</small>
                  </div>
                  <span className="as-v">{formatMoney(p.amountCents)}</span>
                  {p.status === "PENDING" && p.method === "PIX" ? (
                    <a className={`as-pill ${cls}`} href={`/painel/assinatura/pix/${p.id}`}>{label} · ver Pix</a>
                  ) : (
                    <span className={`as-pill ${cls}`}>{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
