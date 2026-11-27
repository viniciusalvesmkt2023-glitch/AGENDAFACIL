import Link from "next/link";
import { CalendarClock, CheckCheck, MessageCircle, MoreHorizontal, RotateCcw, UserX, X, Check } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDateLong, minutesToTime, nowInTimezone } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { PERIODS } from "@/lib/appointments-list";
import { updateAppointmentStatus } from "@/app/painel/actions";
import { listAppointments, readFilters, whereFor, type ListParams } from "./query";
import { Filters, PaymentPill, QuickButton, SheetButtons } from "./controls";
import "./agendamentos.css";

type Props = { searchParams: Promise<ListParams> };

const STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "A confirmar", color: "#8b5cf6" },
  CONFIRMED: { label: "Confirmado", color: "#22c55e" },
  COMPLETED: { label: "Concluído", color: "#3b82f6" },
  NO_SHOW: { label: "Faltou", color: "#f59e0b" },
  CANCELED: { label: "Cancelado", color: "#ef4444" },
};
const PRO_COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#ec4899", "#6366f1", "#f59e0b"];
const LIMIT = 400;
const money = (c: number) => formatMoney(c).replace(",00", "");
const dm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export default async function AppointmentsPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const p = await searchParams;
  const today = nowInTimezone().date;
  const f = readFilters(p, today);
  const where = whereFor(user.businessId, f);

  const [rows, totals, professionals] = await Promise.all([
    listAppointments(user.businessId, f, LIMIT),
    db.appointment.groupBy({ by: ["status", "paymentStatus"], where, _sum: { priceCents: true }, _count: true }),
    db.professional.findMany({ where: { businessId: user.businessId }, orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const count = totals.reduce((s, t) => s + t._count, 0);
  const valid = totals.filter((t) => t.status !== "CANCELED" && t.status !== "NO_SHOW");
  const total = valid.reduce((s, t) => s + (t._sum.priceCents ?? 0), 0);
  const received = valid.filter((t) => t.paymentStatus === "PAID").reduce((s, t) => s + (t._sum.priceCents ?? 0), 0);
  const proColor = new Map(professionals.map((x, i) => [x.id, PRO_COLORS[i % PRO_COLORS.length]]));

  const values = { situacao: f.status, profissional: f.professional, pagamento: f.payment, q: f.q, de: f.period === "datas" ? f.range.from : "", ate: f.period === "datas" ? f.range.to : "" };
  const qs = (patch: Record<string, string>) => {
    const s = new URLSearchParams({ periodo: f.period, ...values, ...patch });
    for (const [k, v] of [...s.entries()]) if (!v || (k === "periodo" && v === "mes")) s.delete(k);
    return s.toString();
  };
  const message = (a: (typeof rows)[number]) =>
    `Olá, ${a.client.name.split(" ")[0]}! Passando para confirmar seu horário na ${user.business.name}: ` +
    `${a.service.name} com ${a.professional.name}, ${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}. Podemos confirmar?`;
  const rangeLabel = f.range.from === f.range.to ? dm(f.range.from) : `${dm(f.range.from)} a ${dm(f.range.to)}`;

  return (
    <div className="am space-y-4">
      <div className="am-top">
        <div className="min-w-0">
          <h1 className="pn-h1">Agendamentos</h1>
          <p className="pn-hello">Todos os agendamentos, com filtros e controle de pagamento.</p>
        </div>
        <div className="am-acts">
          <SheetButtons exportHref={`/painel/agendamentos/exportar?${qs({})}`} />
          <QuickButton />
        </div>
      </div>

      <div className="pn-card am-filters">
        <div>
          <span className="am-lbl">Período · {f.period === "proximos" ? `a partir de ${dm(today)}` : rangeLabel}</span>
          <div className="am-chips">
            {PERIODS.map((x) => (
              <Link key={x.id} href={`/painel/agendamentos?${qs({ periodo: x.id, de: "", ate: "" })}`} className={`am-chip ${f.period === x.id ? "on" : ""}`} aria-current={f.period === x.id ? "true" : undefined}>
                {x.label}
              </Link>
            ))}
          </div>
        </div>
        <Filters base={{ periodo: f.period }} values={values} professionals={professionals} showDates={f.period === "datas"} />
      </div>

      <div className="am-kpis">
        <div className="pn-card am-kpi">
          <small>Agendamentos</small>
          <b data-testid="k-count">{count}</b>
        </div>
        <div className="pn-card am-kpi">
          <small>Valor total</small>
          <b>{money(total)}</b>
        </div>
        <div className="pn-card am-kpi ok">
          <small>Já recebido</small>
          <b data-testid="k-received">{money(received)}</b>
        </div>
        <div className="pn-card am-kpi warn">
          <small>A receber</small>
          <b data-testid="k-pending">{money(total - received)}</b>
        </div>
      </div>

      <div className="pn-card am-tbl">
        {rows.length === 0 ? (
          <p className="am-empty">Nenhum agendamento com esses filtros.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Profissional</th>
                  <th>Situação</th>
                  <th>Pagamento</th>
                  <th className="num">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const s = STATUS[a.status] ?? { label: a.status, color: "#a1a1aa" };
                  const off = a.status === "CANCELED" || a.status === "NO_SHOW";
                  return (
                    <tr key={a.id} data-testid="am-row">
                      <td>{dm(a.date)}</td>
                      <td>
                        <b>{minutesToTime(a.startMinutes)}</b>
                        <small className="am-muted"> – {minutesToTime(a.endMinutes)}</small>
                      </td>
                      <td className="am-who">
                        <b>{a.client.name}</b>
                        <small>{formatPhone(a.client.phone)}</small>
                      </td>
                      <td>{a.service.name}</td>
                      <td>
                        <span className="am-pro">
                          <i style={{ background: proColor.get(a.professionalId) }} />
                          {a.professional.name}
                        </span>
                      </td>
                      <td>
                        <span className="am-pill" style={{ ["--c" as string]: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td>
                        <PaymentPill id={a.id} paid={a.paymentStatus === "PAID"} method={a.paymentMethod} disabled={off && a.paymentStatus !== "PAID"} />
                      </td>
                      <td className="num">{money(a.priceCents)}</td>
                      <td>
                        <RowActions a={a} wa={whatsappLink(a.client.phone, message(a))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="am-cards">
              {rows.map((a) => {
                const s = STATUS[a.status] ?? { label: a.status, color: "#a1a1aa" };
                const off = a.status === "CANCELED" || a.status === "NO_SHOW";
                return (
                  <div key={a.id} className="am-card">
                    <div className="am-tm">
                      <b>{minutesToTime(a.startMinutes)}</b>
                      <small>{a.date === today ? "hoje" : dm(a.date)}</small>
                    </div>
                    <div className="min-w-0">
                      <b className="am-n">{a.client.name}</b>
                      <small className="am-s">
                        {a.service.name} · {a.professional.name}
                      </small>
                      <div className="am-pills">
                        <span className="am-pill" style={{ ["--c" as string]: s.color }}>
                          {s.label}
                        </span>
                        <PaymentPill id={a.id} paid={a.paymentStatus === "PAID"} method={a.paymentMethod} disabled={off && a.paymentStatus !== "PAID"} />
                      </div>
                    </div>
                    <div className="am-r">
                      <b>{money(a.priceCents)}</b>
                      <RowActions a={a} wa={whatsappLink(a.client.phone, message(a))} compact />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="am-foot">
          <span>
            {count} agendamento{count === 1 ? "" : "s"}
            {count > LIMIT ? ` · mostrando os ${LIMIT} primeiros (use os filtros ou exporte a planilha)` : ""}
          </span>
          <span className="hidden sm:inline">Toque na etiqueta de pagamento para marcar como pago</span>
        </div>
      </div>
    </div>
  );
}

type Row = { id: string; status: string; client: { name: string; phone: string } };

function RowActions({ a, wa, compact }: { a: Row; wa: string; compact?: boolean }) {
  const done = a.status === "CANCELED" || a.status === "NO_SHOW" || a.status === "COMPLETED";
  return (
    <div className="am-rowacts">
      {!compact && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="am-ib" aria-label={`WhatsApp de ${a.client.name}`} title="WhatsApp">
          <MessageCircle />
        </a>
      )}
      <details className="pn-more">
        <summary className="am-ib" aria-label="Mais ações">
          <MoreHorizontal />
        </summary>
        <div className="pn-menu">
          {compact && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          )}
          {a.status === "SCHEDULED" && <StatusItem id={a.id} status="CONFIRMED" icon={<Check />}>Confirmar</StatusItem>}
          {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && <StatusItem id={a.id} status="COMPLETED" icon={<CheckCheck />}>Concluir</StatusItem>}
          {done && <StatusItem id={a.id} status="CONFIRMED" icon={<RotateCcw />}>Reabrir</StatusItem>}
          {!done && (
            <>
              <Link href={`/painel/remarcar/${a.id}`}>
                <CalendarClock /> Remarcar
              </Link>
              <StatusItem id={a.id} status="NO_SHOW" icon={<UserX />}>Marcar falta</StatusItem>
              <StatusItem id={a.id} status="CANCELED" icon={<X />} danger>
                Cancelar
              </StatusItem>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function StatusItem({ id, status, icon, danger, children }: { id: string; status: string; icon: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={danger ? "danger" : ""}>
        {icon} {children}
      </button>
    </form>
  );
}
