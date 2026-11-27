import Link from "next/link";
import { AlertTriangle, CircleDollarSign, Clock, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { PLANS, isPlanId } from "@/lib/plans";
import { localToUtc, todayInTimezone } from "@/lib/time";

type Props = { searchParams: Promise<{ f?: string }> };

const FILTERS = [
  { id: "TODOS", label: "Todos" },
  { id: "PAID", label: "Pagos" },
  { id: "PENDING", label: "Aguardando" },
  { id: "FAILED", label: "Falharam" },
  { id: "REFUNDED", label: "Reembolsados" },
  { id: "EXPIRED", label: "Expirados" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];
const isFilter = (v: unknown): v is Filter => FILTERS.some((f) => f.id === v);

const PAY: Record<string, [string, string]> = { PAID: ["Pago", "ad-p-ok"], PENDING: ["Aguardando", "ad-p-late"], REFUNDED: ["Reembolsado", "ad-p-gray"], FAILED: ["Falhou", "ad-p-off"], EXPIRED: ["Expirou", "ad-p-gray"] };
const METHOD: Record<string, string> = { PIX: "Pix", CARD: "Cartão", OTHER: "Manual" };
const fmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);

export default async function AdminPayments({ searchParams }: Props) {
  const p = await searchParams;
  const filter = isFilter(p.f) ? p.f : "TODOS";
  const monthStart = localToUtc(`${todayInTimezone().slice(0, 7)}-01`, 0);

  const [list, month, counts] = await Promise.all([
    db.payment.findMany({
      where: filter === "TODOS" ? {} : { status: filter },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { business: { select: { id: true, name: true, slug: true } } },
    }),
    db.payment.groupBy({ by: ["status"], where: { createdAt: { gte: monthStart } }, _sum: { amountCents: true }, _count: true }),
    db.payment.groupBy({ by: ["status"], _count: true }),
  ]);
  const m = (s: string) => month.find((r) => r.status === s);
  const paidMonth = await db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountCents: true }, _count: true });
  const total = counts.reduce((s, r) => s + r._count, 0);
  const countOf = (f: Filter) => (f === "TODOS" ? total : counts.find((r) => r.status === f)?._count ?? 0);
  const bad = (m("FAILED")?._count ?? 0) + (m("REFUNDED")?._count ?? 0);

  return (
    <section className="ad-view on">
      <div className="ad-top">
        <div><h1>Pagamentos</h1><p>Todas as cobranças de cartão, Pix e ativações manuais</p></div>
      </div>

      <div className="ad-grid ad-kpis">
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-green"><CircleDollarSign /></span>
          <small>Recebido este mês</small>
          <b>{formatMoney(paidMonth._sum.amountCents ?? 0)}</b>
          <span className="ad-dl ad-flat">{paidMonth._count} pagamento{paidMonth._count === 1 ? "" : "s"}</span>
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-blue"><Receipt /></span>
          <small>Ticket médio</small>
          <b>{formatMoney(paidMonth._count ? Math.round((paidMonth._sum.amountCents ?? 0) / paidMonth._count) : 0)}</b>
          <span className="ad-dl ad-flat">por pagamento no mês</span>
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-amber"><Clock /></span>
          <small>Aguardando pagamento</small>
          <b>{m("PENDING")?._count ?? 0}</b>
          <span className="ad-dl ad-flat">{formatMoney(m("PENDING")?._sum.amountCents ?? 0)} em aberto no mês</span>
        </div>
        <div className="ad-card ad-kpi">
          <span className="ad-ic ad-g-red"><AlertTriangle /></span>
          <small>Falhas e reembolsos</small>
          <b>{bad}</b>
          <span className="ad-dl ad-flat">neste mês</span>
        </div>
      </div>

      <div className="ad-filters" style={{ marginTop: 16 }}>
        {FILTERS.map((f) => (
          <Link key={f.id} href={f.id === "TODOS" ? "/admin/pagamentos" : `/admin/pagamentos?f=${f.id}`} className={`ad-chip ${f.id === filter ? "on" : ""}`}>
            {f.label} <small>{countOf(f.id)}</small>
          </Link>
        ))}
      </div>

      <div className="ad-tbl-wrap">
        <table>
          <thead><tr><th>Quando</th><th>Estabelecimento</th><th>Plano</th><th>Forma</th><th>Situação</th><th className="ad-num">Valor</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>Nenhum pagamento por aqui</td></tr>}
            {list.map((x) => (
              <tr key={x.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmt(x.paidAt ?? x.createdAt)}</td>
                <td><Link href={`/admin/clientes/${x.business.id}`} className="ad-who"><div><b>{x.business.name}</b><small>horaboa.com/{x.business.slug}</small></div></Link></td>
                <td>{isPlanId(x.plan) ? PLANS[x.plan].name : x.plan}</td>
                <td>{METHOD[x.method] ?? x.method}</td>
                <td><span className={`ad-pill ${PAY[x.status]?.[1] ?? "ad-p-gray"}`}>{PAY[x.status]?.[0] ?? x.status}</span></td>
                <td className="ad-num">{formatMoney(x.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 200 && <p className="ad-empty-s" style={{ marginTop: 10 }}>Mostrando os 200 mais recentes.</p>}
    </section>
  );
}
