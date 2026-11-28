import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { clientStatus, STATUS_LABEL } from "@/lib/admin-stats";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { PLANS, PLAN_LIST, isPlanId } from "@/lib/plans";
import { getAccessState } from "@/lib/subscription";
import { addDays, todayInTimezone } from "@/lib/time";
import { SubscriptionControls } from "./controls";

type Props = { params: Promise<{ id: string }> };

const PILL: Record<string, string> = { TESTE: "ad-p-trial", ATIVO: "ad-p-ok", VENCIDO: "ad-p-late", CANCELADO: "ad-p-off" };
const PAY: Record<string, [string, string]> = { PAID: ["Pago", "ad-p-ok"], PENDING: ["Aguardando", "ad-p-late"], REFUNDED: ["Reembolsado", "ad-p-gray"], FAILED: ["Falhou", "ad-p-off"], EXPIRED: ["Expirou", "ad-p-gray"] };
const METHOD: Record<string, string> = { PIX: "Pix", CARD: "Cartão", OTHER: "Manual" };
const ACTION: Record<string, string> = { EXTEND: "Acesso estendido", GRANT_PLAN: "Plano ativado", CANCEL: "Acesso cancelado" };
const fmt = (d: Date, time = false) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "America/Sao_Paulo" }).format(d);

export default async function AdminClient({ params }: Props) {
  await requireAdmin(); // checa em cada página (o layout sozinho não protege as navegações internas)
  const { id } = await params;
  const b = await db.business.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" }, take: 1 },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
      adminActions: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { professionals: true, services: true, clients: true } },
    },
  });
  if (!b) notFound();
  const owner = b.users[0];
  const state = getAccessState(b);
  const status = clientStatus(state);
  const plan = b.plan ?? b.asaasPlan;
  const paid = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);

  // agendamentos por semana (8 semanas)
  const today = todayInTimezone();
  const from = addDays(today, -55);
  const appts = await db.appointment.findMany({ where: { businessId: b.id, date: { gte: from, lte: today }, status: { not: "CANCELED" } }, select: { date: true } });
  const weeks = Array.from({ length: 8 }, (_, i) => ({ start: addDays(from, i * 7), count: 0 }));
  for (const a of appts) {
    const i = Math.floor((new Date(`${a.date}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / (7 * 86_400_000));
    if (weeks[i]) weeks[i].count += 1;
  }
  const appts30 = appts.filter((a) => a.date >= addDays(today, -29)).length;
  const wmx = Math.max(1, ...weeks.map((w) => w.count));

  const access =
    state.kind === "trial" ? `Teste acaba em ${state.daysLeft} dia${state.daysLeft === 1 ? "" : "s"}` :
    state.kind === "active" ? (state.renewsAt ? `Até ${fmt(state.renewsAt)}` : "Ativo") :
    state.kind === "grace" ? `Vencido · bloqueia em ${state.daysLeft} dia(s)` : "Sem acesso";

  return (
    <section className="ad-view on">
      <Link href="/admin/clientes" className="ad-mini ad-soft" style={{ height: 34, marginBottom: 14, display: "inline-flex" }}><ArrowLeft /> Clientes</Link>
      <div className="ad-grid ad-ficha">
        <div>
          <div className="ad-card">
            <div className="ad-dh">
              <span className="ad-av ad-g-brand">{b.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <h2>{b.name}</h2>
                <p>horaboa.com/{b.slug}</p>
                <p style={{ marginTop: 6 }}><span className={`ad-pill ${PILL[status]}`}>{STATUS_LABEL[status]}</span></p>
              </div>
            </div>
            <div className="ad-dstats">
              <div><small>Plano</small><b>{isPlanId(plan) && status !== "TESTE" ? PLANS[plan].name : status === "TESTE" ? "Teste grátis" : "—"}</b></div>
              <div><small>Acesso</small><b style={{ fontSize: 15 }}>{access}</b></div>
              <div><small>Total pago</small><b>{formatMoney(paid)}</b></div>
              <div><small>Agendamentos (30 dias)</small><b>{appts30}</b></div>
            </div>
            <div className="ad-acts">
              {b.phone ? (
                <a className="ad-act ad-g-wa" target="_blank" rel="noopener noreferrer" href={whatsappLink(b.phone, `Olá, ${owner?.name.split(" ")[0] ?? ""}! Aqui é do HoraBoa.`)}><MessageCircle /> WhatsApp do dono</a>
              ) : (
                <span className="ad-act ad-soft" style={{ opacity: 0.6 }}>Sem telefone</span>
              )}
              <a className="ad-act ad-soft" target="_blank" href={`/${b.slug}`}><ExternalLink /> Ver página</a>
            </div>
          </div>

          <div className="ad-card" style={{ marginTop: 12 }}>
            <h3>Assinatura</h3>
            <SubscriptionControls
              id={b.id}
              name={b.name}
              plans={PLAN_LIST.map((p) => ({ id: p.id, name: p.name, price: `${formatMoney(p.priceCents)}${p.months > 1 ? ` · ${p.months} meses` : " · 1 mês"}` }))}
            />
          </div>
        </div>

        <div>
          <div className="ad-card">
            <h3>Agendamentos por semana <small>8 semanas</small></h3>
            {appts.length === 0 ? (
              <p className="ad-empty-s" style={{ marginTop: 10 }}>Nenhum agendamento nas últimas 8 semanas.</p>
            ) : (
              <div className="ad-wk" role="img" aria-label="Agendamentos por semana">
                {weeks.map((w, k) => (
                  <div key={w.start} title={`${w.count} agendamento${w.count === 1 ? "" : "s"}`}>
                    <small>{w.count || ""}</small>
                    <i className={k === 7 ? "now" : ""} style={{ height: `${Math.max(w.count ? 6 : 2, (78 * w.count) / wmx)}px` }} />
                    <span>{w.start.slice(8)}/{w.start.slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ad-card" style={{ marginTop: 12 }}>
            <h3>Pagamentos</h3>
            <div className="ad-list">
              {b.payments.length === 0 && <p className="ad-empty-s">Nenhum pagamento ainda.</p>}
              {b.payments.map((p) => (
                <div key={p.id} className="ad-li">
                  <span className={`ad-av ${p.method === "PIX" ? "ad-g-teal" : p.method === "CARD" ? "ad-g-blue" : "ad-g-gray"}`} style={{ width: 30, height: 30, fontSize: 10 }}>{p.method === "PIX" ? "PIX" : p.method === "CARD" ? "💳" : "✎"}</span>
                  <div className="ad-t"><b>{isPlanId(p.plan) ? PLANS[p.plan].name : p.plan}</b><small>{fmt(p.paidAt ?? p.createdAt, true)} · {METHOD[p.method] ?? p.method}</small></div>
                  <span className={`ad-pill ${PAY[p.status]?.[1] ?? "ad-p-gray"}`}>{PAY[p.status]?.[0] ?? p.status}</span>
                  <b style={{ fontSize: 13, marginLeft: 6, fontVariantNumeric: "tabular-nums" }}>{formatMoney(p.amountCents)}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-card" style={{ marginTop: 12 }}>
            <h3>Histórico do admin</h3>
            <div className="ad-list">
              {b.adminActions.length === 0 && <p className="ad-empty-s">Nenhuma ação do admin nessa conta.</p>}
              {b.adminActions.map((a) => (
                <div key={a.id} className="ad-li">
                  <div className="ad-t"><b>{ACTION[a.action] ?? a.action}</b><small style={{ whiteSpace: "normal" }}>{a.detail}</small><small>{fmt(a.createdAt, true)} · {a.adminEmail}</small></div>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-card" style={{ marginTop: 12 }}>
            <h3>Dados</h3>
            <div className="ad-kv" style={{ marginTop: 10 }}>
              <span>Dono</span><b>{owner?.name ?? "—"}</b>
              <span>E-mail</span><b>{owner?.email ?? "—"}</b>
              <span>Telefone</span><b>{b.phone ? formatPhone(b.phone) : "—"}</b>
              <span>WhatsApp do negócio</span><b>{b.whatsappStatus === "CONNECTED" ? "Conectado ✓" : b.whatsappConnectedAt ? "Desconectado" : "Nunca conectou"}</b>
              <span>Cliente desde</span><b>{fmt(b.createdAt)}</b>
              <span>Profissionais · serviços</span><b>{b._count.professionals} · {b._count.services}</b>
              <span>Clientes cadastrados</span><b>{b._count.clients}</b>
              <span>Cobrança</span><b>{b.stripeSubscriptionId ? "Cartão (Stripe)" : b.asaasSubscriptionId ? "Pix automático (Asaas)" : "Nenhuma automática"}</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
