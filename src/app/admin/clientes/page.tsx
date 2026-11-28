import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { FILTERS, isFilter, listClients } from "@/lib/admin-clients";
import { STATUS_LABEL } from "@/lib/admin-stats";
import { formatMoney } from "@/lib/format";
import { PLANS, isPlanId } from "@/lib/plans";

type Props = { searchParams: Promise<{ f?: string; q?: string; wa?: string }> };

const COLORS = ["ad-g-brand", "ad-g-blue", "ad-g-purple", "ad-g-teal", "ad-g-amber", "ad-g-green"];
const colorOf = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const PILL: Record<string, string> = { TESTE: "ad-p-trial", ATIVO: "ad-p-ok", VENCIDO: "ad-p-late", CANCELADO: "ad-p-off" };
const fmtDate = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d).replace(" de ", " ").replace(".", "");

export default async function AdminClients({ searchParams }: Props) {
  await requireAdmin(); // checa em cada página (o layout sozinho não protege as navegações internas)
  const p = await searchParams;
  const filter = isFilter(p.f) ? p.f : "TODOS";
  const q = p.q ?? "";
  const waOff = p.wa === "off";
  const { rows, counts } = await listClients({ filter, q, waOff });
  const qs = (f: string) => `/admin/clientes?${new URLSearchParams({ ...(f !== "TODOS" ? { f } : {}), ...(q ? { q } : {}) })}`;

  return (
    <section className="ad-view on">
      <div className="ad-top">
        <div><h1>Clientes</h1><p>Estabelecimentos que usam o HoraBoa</p></div>
        <a className="ad-mini ad-soft" style={{ height: 38 }} href={`/admin/clientes/exportar?${new URLSearchParams({ f: filter, q })}`}><Download /> Exportar planilha</a>
      </div>
      <div className="ad-filters">
        {FILTERS.map((f) => (
          <Link key={f.id} href={qs(f.id)} className={`ad-chip ${f.id === filter && !waOff ? "on" : ""}`}>
            {f.label} <small>{counts[f.id]}</small>
          </Link>
        ))}
        {waOff && <Link href="/admin/clientes" className="ad-chip on">WhatsApp desconectado ✕</Link>}
      </div>
      <form className="ad-filters" style={{ marginTop: 10 }} action="/admin/clientes">
        {filter !== "TODOS" && <input type="hidden" name="f" value={filter} />}
        <label className="ad-search"><Search /><input name="q" defaultValue={q} placeholder="Buscar por nome, dono, e-mail, link ou telefone" aria-label="Buscar clientes" /></label>
      </form>
      <div className="ad-tbl-wrap">
        <table>
          <thead><tr><th>Estabelecimento</th><th>Dono</th><th>Plano</th><th>Situação</th><th>Cliente desde</th><th className="ad-num">Agend. 30d</th><th className="ad-num">Total pago</th><th>WhatsApp</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>Nenhum cliente encontrado</td></tr>}
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/clientes/${c.id}`} className="ad-who"><span className={`ad-av ${colorOf(c.id)}`}>{c.name.charAt(0).toUpperCase()}</span><div><b>{c.name}</b><small>horaboa.com/{c.slug}</small></div></Link></td>
                <td><Link href={`/admin/clientes/${c.id}`} className="ad-who"><div><b style={{ fontWeight: 600 }}>{c.owner || "—"}</b><small>{c.email}</small></div></Link></td>
                <td>{isPlanId(c.plan) ? PLANS[c.plan].name : <span style={{ color: "var(--faint)" }}>—</span>}</td>
                <td><span className={`ad-pill ${PILL[c.status]}`}>{STATUS_LABEL[c.status]}{c.trialDaysLeft !== null ? ` · ${c.trialDaysLeft}d` : ""}</span></td>
                <td>{fmtDate(c.createdAt)}</td>
                <td className="ad-num">{c.appts30}</td>
                <td className="ad-num">{c.paidCents ? formatMoney(c.paidCents) : "—"}</td>
                <td><span className="ad-wa-dot"><i style={{ background: c.whatsapp ? "#22c55e" : "#d4d4d8" }} />{c.whatsapp ? "Conectado" : c.whatsappDown ? "Caiu" : "Desligado"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ad-note">{rows.length} de {counts.TODOS} clientes</p>
    </section>
  );
}
