import Link from "next/link";
import { AlertTriangle, CircleDollarSign, Gift, MessageCircle, RefreshCw, Users, WifiOff, CreditCard } from "lucide-react";
import { isPeriod, overview, PERIODS, salesSeries, type Period } from "@/lib/admin-stats";
import { formatMoney, whatsappLink } from "@/lib/format";
import { PLANS, isPlanId } from "@/lib/plans";
import { AutoRefresh, SalesChart } from "./charts";

type Props = { searchParams: Promise<{ periodo?: string }> };

const COLORS = ["ad-g-brand", "ad-g-blue", "ad-g-purple", "ad-g-teal", "ad-g-amber", "ad-g-green"];
const colorOf = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const METHOD: Record<string, string> = { PIX: "Pix", CARD: "Cartão", OTHER: "Manual" };
const LABEL: Record<Period, string> = { hoje: "por hora, hoje", "7": "por dia, 7 dias", "30": "por dia, 30 dias", "12m": "por mês, 12 meses" };
const PREV: Record<Period, string> = { hoje: "ontem", "7": "7 dias anteriores", "30": "30 dias anteriores", "12m": "12 meses anteriores" };

function ago(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? "ontem" : `${days} dias`;
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function AdminOverview({ searchParams }: Props) {
  const { periodo } = await searchParams;
  const period: Period = isPeriod(periodo) ? periodo : "hoje";
  const [s, o] = await Promise.all([salesSeries(period), overview()]);
  const delta = s.prevTotal ? Math.round((s.total / s.prevTotal - 1) * 100) : null;
  const f = o.funnel;
  const planTotal = Object.values(o.plans).reduce((a, b) => a + b, 0);
  const methodTotal = Object.values(o.methods).reduce((a, b) => a + b, 0);
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <section className="ad-view on">
      <AutoRefresh />
      <div className="ad-top">
        <div>
          <h1>Visão geral</h1>
          <p className="first-letter:uppercase">{today}</p>
        </div>
        <nav className="ad-seg" aria-label="Período">
          {PERIODS.map((p) => (
            <Link key={p.id} href={p.id === "hoje" ? "/admin" : `/admin?periodo=${p.id}`} className={p.id === period ? "on" : ""} aria-current={p.id === period ? "true" : undefined}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="ad-grid ad-kpis">
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-green"><CircleDollarSign /></span>
          <small>Vendas no período</small>
          <b>{formatMoney(s.total)}</b>
          {delta === null ? (
            <span className="ad-dl ad-flat">{s.count} venda{s.count === 1 ? "" : "s"}</span>
          ) : (
            <span className={`ad-dl ${delta >= 0 ? "ad-up" : "ad-down"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs {PREV[period]}</span>
          )}
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-brand"><RefreshCw /></span>
          <small>Receita recorrente / mês</small>
          <b>{formatMoney(o.mrr)}</b>
          <span className="ad-dl ad-flat">soma dos planos ativos por mês</span>
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-blue"><Users /></span>
          <small>Clientes pagantes</small>
          <b>{o.payingCount}</b>
          <span className={`ad-dl ${o.newPaying ? "ad-up" : "ad-flat"}`}>{o.newPaying ? `▲ +${o.newPaying} este mês` : "nenhum novo este mês"}</span>
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-purple"><Gift /></span>
          <small>Em teste grátis</small>
          <b>{o.trialCount}</b>
          <span className="ad-dl ad-flat">{o.endingCount} acaba{o.endingCount === 1 ? "" : "m"} em 3 dias</span>
        </div>
      </div>

      <div className="ad-grid ad-row2">
        <div className="ad-card">
          <div className="ad-chart-hd">
            <h3 style={{ width: "100%" }}>Vendas <small>{LABEL[period]}</small></h3>
            <span className="ad-tot">{formatMoney(s.total)}</span>
            <span className="ad-sub">{s.count} venda{s.count === 1 ? "" : "s"} · a barra verde é o período atual</span>
          </div>
          <SalesChart buckets={s.buckets} label={LABEL[period]} />
        </div>
        <div className="ad-card">
          <h3>Vendas ao vivo <span className="ad-live"><i />agora</span></h3>
          <div className="ad-feed">
            {o.recent.length === 0 && <p className="ad-empty-s">As vendas aparecem aqui assim que alguém assinar.</p>}
            {o.recent.map((p) => (
              <Link key={p.id} href={`/admin/clientes/${p.businessId}`} className={`ad-sale ${Date.now() - p.at.getTime() < 10 * 60000 ? "new" : ""}`}>
                <span className={`ad-av ${colorOf(p.businessId)}`}>{p.name.charAt(0).toUpperCase()}</span>
                <div className="ad-t"><b>{p.name}</b><small>{isPlanId(p.plan) ? PLANS[p.plan].name : p.plan} · {METHOD[p.method] ?? p.method}</small></div>
                <div className="ad-v"><b>+ {formatMoney(p.cents)}</b><small>{ago(p.at)}</small></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="ad-grid ad-row3">
        <div className="ad-card">
          <h3>Do teste à assinatura <small>cadastros dos últimos 30 dias</small></h3>
          <div className="ad-fun">
            {[["Criaram a conta", f.created], ["Configuraram serviços e horários", f.configured], ["Receberam o 1º agendamento", f.firstBooking], ["Assinaram um plano", f.paid]].map(([l, v]) => (
              <div key={l as string}>
                <span>{l}</span>
                <b>{v} <small>{pct(v as number, f.created)}%</small></b>
                <i><em style={{ width: `${pct(v as number, f.created)}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
        <div className="ad-card">
          <h3>Planos dos pagantes <small>{planTotal} cliente{planTotal === 1 ? "" : "s"}</small></h3>
          <Split items={[["Mensal", o.plans.MONTHLY, "#fe6e02"], ["Semestral", o.plans.SEMIANNUAL, "#3b82f6"], ["Anual", o.plans.ANNUAL, "#0d9488"]]} total={planTotal} />
          <h3 style={{ marginTop: 18 }}>Forma de pagamento <small>30 dias</small></h3>
          <Split items={[["Pix", o.methods.PIX ?? 0, "#fe6e02"], ["Cartão", o.methods.CARD ?? 0, "#3b82f6"], ...(o.methods.OTHER ? [["Manual", o.methods.OTHER, "#0d9488"] as [string, number, string]] : [])]} total={methodTotal} unit="venda" />
        </div>
        <div className="ad-card">
          <h3>Teste grátis acabando <small>próximos 3 dias</small></h3>
          <div className="ad-list">
            {o.ending.length === 0 && <p className="ad-empty-s">Ninguém com teste acabando agora.</p>}
            {o.ending.map((c) => {
              const days = Math.max(0, Math.ceil((c.endsAt.getTime() - Date.now()) / 86_400_000));
              return (
                <div key={c.id} className="ad-li">
                  <span className={`ad-av ${colorOf(c.id)}`}>{c.name.charAt(0).toUpperCase()}</span>
                  <Link href={`/admin/clientes/${c.id}`} className="ad-t"><b>{c.name}</b><small>acaba {days === 0 ? "hoje" : `em ${days} dia${days > 1 ? "s" : ""}`}</small></Link>
                  {c.phone && (
                    <a className="ad-mini ad-g-wa" target="_blank" rel="noopener noreferrer" href={whatsappLink(c.phone, `Olá, ${c.owner.split(" ")[0]}! Aqui é do HoraBoa. Vi que seu teste grátis está acabando — posso te ajudar a continuar?`)}>
                      <MessageCircle /> Chamar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ad-grid ad-row3">
        <div className="ad-card">
          <h3>Precisam de atenção</h3>
          <div className="ad-list">
            <Attention icon={<AlertTriangle />} color="ad-g-amber" title={`${o.attention.late.length} assinatura${o.attention.late.length === 1 ? "" : "s"} vencida${o.attention.late.length === 1 ? "" : "s"}`} sub={o.attention.late.slice(0, 3).join(", ") || "Tudo em dia"} href="/admin/clientes?f=VENCIDO" />
            <Attention icon={<WifiOff />} color="ad-g-red" title={`${o.attention.waDown} WhatsApp desconectado${o.attention.waDown === 1 ? "" : "s"}`} sub="Lembretes parados nesses clientes" href="/admin/clientes?wa=off" />
            <Attention icon={<CreditCard />} color="ad-g-blue" title={`${o.attention.pending24} Pix aguardando pagamento`} sub="Gerados nas últimas 24h" href="/admin/pagamentos?f=PENDING" />
          </div>
        </div>
        <div className="ad-card">
          <h3>Novos cadastros <small>por dia, 14 dias</small></h3>
          <Signups days={o.signupDays} />
        </div>
        <div className="ad-card">
          <h3>Uso da plataforma <small>hoje</small></h3>
          <div className="ad-keys">
            {[
              ["Agendamentos feitos hoje", o.usage.apptsToday.toLocaleString("pt-BR"), "#fe6e02"],
              ["Pelo link do cliente", `${pct(o.usage.onlineToday, o.usage.apptsToday)}%`, "#3b82f6"],
              ["Mensagens de WhatsApp enviadas", o.usage.msgsToday.toLocaleString("pt-BR"), "#16a34a"],
              ["Lembretes enviados", o.usage.remindersToday.toLocaleString("pt-BR"), "#0d9488"],
              ["Estabelecimentos cadastrados", o.totals.all.toLocaleString("pt-BR"), "#7c3aed"],
            ].map(([l, v, c]) => (
              <div key={l}><i style={{ background: c }} />{l}<b>{v}</b></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Split({ items, total, unit }: { items: [string, number, string][]; total: number; unit?: string }) {
  return (
    <>
      <div className="ad-split" aria-hidden="true">
        {total > 0 ? items.filter(([, v]) => v > 0).map(([l, v, c]) => <i key={l} style={{ width: `${(v / total) * 100}%`, background: c }} />) : <i style={{ width: "100%", background: "rgba(15,23,42,.08)" }} />}
      </div>
      <div className="ad-keys">
        {items.map(([l, v, c]) => (
          <div key={l}><i style={{ background: c }} />{l}<b>{v}{unit ? ` ${unit}${v === 1 ? "" : "s"}` : ""}</b><small>{pct(v, total)}%</small></div>
        ))}
      </div>
    </>
  );
}

function Attention({ icon, color, title, sub, href }: { icon: React.ReactNode; color: string; title: string; sub: string; href: string }) {
  return (
    <Link href={href} className="ad-li">
      <span className={`ad-av ${color}`}>{icon}</span>
      <div className="ad-t"><b>{title}</b><small>{sub}</small></div>
      <span className="ad-mini ad-soft">Ver</span>
    </Link>
  );
}

function Signups({ days }: { days: { date: string; count: number }[] }) {
  const W = 320, H = 140, mx = Math.max(4, ...days.map((d) => d.count)), step = W / days.length, bw = step * 0.6;
  const today = days[days.length - 1];
  return (
    <div className="ad-chart" style={{ height: 140 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Novos cadastros por dia">
        <line className="ad-grid-l" x1="0" x2={W} y1={H - 18} y2={H - 18} />
        {days.map((d, i) => {
          const h = ((H - 26) * d.count) / mx, x = step * i + (step - bw) / 2;
          return (
            <path key={d.date} fill={i === days.length - 1 ? "#3b82f6" : "rgba(59,130,246,.45)"} d={h ? `M${x},${H - 18} V${H - 18 - h + 3} q0,-3 3,-3 h${bw - 6} q3,0 3,3 V${H - 18} Z` : ""}>
              <title>{`${d.date.slice(8)}/${d.date.slice(5, 7)}: ${d.count} cadastro${d.count === 1 ? "" : "s"}`}</title>
            </path>
          );
        })}
      </svg>
      <div className="ad-sig-foot"><span>14 dias atrás</span><span>hoje · {today.count}</span></div>
    </div>
  );
}
