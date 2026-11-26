import Link from "next/link";
import {
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RotateCcw,
  UserX,
  X,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { addDays, formatDateLong, isValidDate, minutesToTime, nowInTimezone, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatMoney, whatsappLink } from "@/lib/format";
import { FormMessage } from "@/components/ui";
import { updateAppointmentStatus } from "@/app/painel/actions";
import { DatePickerButton } from "./agenda-controls";
import { blockAppliesOn } from "@/lib/schedule";
import { blockTime } from "@/lib/blocks";

type Props = { searchParams: Promise<{ data?: string; profissional?: string; erro?: string }> };

/** Cor e nome de cada situação do agendamento. */
const STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Agendado", color: "#8b5cf6" },
  CONFIRMED: { label: "Confirmado", color: "#22c55e" },
  COMPLETED: { label: "Concluído", color: "#3b82f6" },
  NO_SHOW: { label: "Faltou", color: "#f59e0b" },
  CANCELED: { label: "Cancelado", color: "#ef4444" },
};
const AVATARS = ["pn-g-gray", "pn-g-blue", "pn-g-purple", "pn-g-teal", "pn-g-pink", "pn-g-indigo"];
const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

function untilLabel(diff: number) {
  if (diff <= 0) return "agora";
  if (diff < 60) return `em ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `em ${h}h${m ? ` ${m}min` : ""}`;
}

export default async function AgendaPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const now = nowInTimezone();
  const today = now.date;
  const date = params.data && isValidDate(params.data) ? params.data : today;
  const pro = params.profissional || "";
  // Faixa de dias: 3 antes e 10 depois da data escolhida
  const days = Array.from({ length: 14 }, (_, i) => addDays(date, i - 3));

  const [appointments, professionals, dayBlocks, perDay] = await Promise.all([
    db.appointment.findMany({
      where: { businessId: user.businessId, date, ...(pro ? { professionalId: pro } : {}) },
      include: { client: true, service: true, professional: true },
      orderBy: [{ startMinutes: "asc" }],
    }),
    db.professional.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
    db.timeBlock.findMany({
      where: {
        businessId: user.businessId,
        date: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
        ...(pro ? { AND: [{ OR: [{ professionalId: null }, { professionalId: pro }] }] } : {}),
      },
      include: { professional: { select: { name: true } } },
    }),
    // Pontinho embaixo dos dias que têm agendamento
    db.appointment.groupBy({
      by: ["date"],
      where: { businessId: user.businessId, date: { in: days }, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] }, ...(pro ? { professionalId: pro } : {}) },
      _count: true,
    }),
  ]);
  const busyDays = new Set(perDay.map((d) => d.date));
  const blocks = dayBlocks
    .filter((b) => blockAppliesOn(b, date, weekdayOf(date)))
    .sort((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1));

  const active = appointments.filter((a) => a.status !== "CANCELED");
  const revenue = active.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + a.priceCents, 0);
  const lost = appointments.filter((a) => a.status === "CANCELED" || a.status === "NO_SHOW").length;
  const href = (d: string, p = pro) => `/painel?data=${d}${p ? `&profissional=${p}` : ""}`;
  // Próximo atendimento (destaque), só no dia de hoje
  const next =
    date === today
      ? appointments.find((a) => a.endMinutes > now.minutes && (a.status === "SCHEDULED" || a.status === "CONFIRMED"))
      : undefined;
  const firstName = user.name.split(" ")[0];
  const [, m, d] = date.split("-").map(Number);
  const message = (a: (typeof appointments)[number]) =>
    `Olá, ${a.client.name.split(" ")[0]}! Passando para confirmar seu horário na ${user.business.name}: ` +
    `${a.service.name} com ${a.professional.name}, ${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}. Podemos confirmar?`;

  return (
    <div className="space-y-4">
      {/* Saudação e data */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="pn-hello">
            {greeting(now.minutes)}, {firstName} 👋
          </p>
          <h1 className="pn-h1">
            {date === today ? "Hoje" : WEEKDAY_NAMES[weekdayOf(date)]}, <em>{d} de {MONTHS[m - 1]}</em>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={href(addDays(date, -1))} className="pn-ib hidden md:grid" aria-label="Dia anterior">
            <ChevronLeft />
          </Link>
          {date !== today && (
            <Link href={href(today)} className="pn-btn sm soft">
              Hoje
            </Link>
          )}
          <Link href={href(addDays(date, 1))} className="pn-ib hidden md:grid" aria-label="Próximo dia">
            <ChevronRight />
          </Link>
          <DatePickerButton date={date} professional={pro} />
          <Link href={`/painel/novo?data=${date}`} className="pn-btn pn-g-brand hidden md:inline-flex">
            <CalendarPlus /> Novo agendamento
          </Link>
        </div>
      </div>

      {/* Faixa de dias */}
      <div className="pn-days">
        {days.map((day) => (
          <Link key={day} href={href(day)} className={`pn-day pn-card ${day === date ? "sel" : ""}`} aria-current={day === date ? "date" : undefined}>
            <small>{day === today ? "Hoje" : WEEKDAYS_SHORT[weekdayOf(day)]}</small>
            <b>{Number(day.slice(8))}</b>
            <i className={busyDays.has(day) ? "" : "no"} />
          </Link>
        ))}
      </div>

      {/* Resumo do dia */}
      <div className="pn-stats">
        <div className="pn-st pn-card">
          <div className="ic pn-g-green"><Check strokeWidth={2.6} /></div>
          <b>{active.length}</b>
          <small>Agendados</small>
        </div>
        <div className="pn-st pn-card">
          <div className="ic pn-g-blue"><DollarSign strokeWidth={2.6} /></div>
          <b>{formatMoney(revenue).replace(",00", "")}</b>
          <small>Previsto</small>
        </div>
        <div className="pn-st pn-card">
          <div className="ic pn-g-red"><X strokeWidth={2.6} /></div>
          <b>{lost}</b>
          <small>Cancel./faltas</small>
        </div>
      </div>

      {/* Filtro por profissional */}
      {professionals.length > 1 && (
        <div className="pn-chips">
          <Link href={href(date, "")} className={`pn-chip plain pn-card ${pro === "" ? "on" : ""}`}>
            Todos
          </Link>
          {professionals.map((p, i) => (
            <Link key={p.id} href={href(date, p.id)} className={`pn-chip pn-card ${pro === p.id ? "on" : ""}`}>
              <span className={`pn-av ${AVATARS[i % AVATARS.length]}`}>{p.name.charAt(0).toUpperCase()}</span>
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {params.erro === "conflito" && <FormMessage error="Não foi possível reabrir: o horário já está ocupado por outro agendamento." />}

      {/* Próximo atendimento */}
      {next && (
        <section>
          <div className="pn-sec">
            <h3>Próximo</h3>
            <span>{untilLabel(next.startMinutes - now.minutes)}</span>
          </div>
          <div className="pn-next pn-glass" data-testid="next-appointment">
            <span className="pn-pill">
              <span className="pn-live" /> {next.startMinutes <= now.minutes ? "Em atendimento" : `Às ${minutesToTime(next.startMinutes)}`}
            </span>
            <div className="pn-nrow">
              <div className="pn-bigav">{next.client.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <b>{next.client.name}</b>
                <small>
                  {next.service.name} · {next.professional.name}
                </small>
              </div>
              <div className="pn-ntime">
                <b>{minutesToTime(next.startMinutes)}</b>
                <small>até {minutesToTime(next.endMinutes)}</small>
              </div>
            </div>
            <div className="pn-acts">
              {next.status === "SCHEDULED" ? (
                <StatusForm id={next.id} status="CONFIRMED" className="pn-btn pn-g-green">
                  <Check /> Confirmar
                </StatusForm>
              ) : (
                <StatusForm id={next.id} status="COMPLETED" className="pn-btn pn-g-green">
                  <CheckCheck /> Concluir
                </StatusForm>
              )}
              <a href={whatsappLink(next.client.phone, message(next))} target="_blank" className="pn-btn sq pn-g-wa" aria-label={`WhatsApp de ${next.client.name}`}>
                <MessageCircle />
              </a>
              <a href={`tel:+${next.client.phone}`} className="pn-btn sq pn-g-blue" aria-label={`Ligar para ${next.client.name}`}>
                <Phone />
              </a>
              <MoreMenu id={next.id} status={next.status} size="" />
            </div>
          </div>
        </section>
      )}

      {/* Bloqueios do dia */}
      {blocks.map((b) => (
        <div key={b.id} className="pn-block">
          <span className="ic pn-g-amber"><Lock /></span>
          <div className="min-w-0">
            <b className="first-letter:uppercase">
              {blockTime(b)}
              {b.reason && ` · ${b.reason}`}
            </b>
            <small>Sem atendimento · {b.professional?.name ?? "todos"}</small>
          </div>
          <Link href="/painel/bloqueios">Ver</Link>
        </div>
      ))}

      {/* Dia completo */}
      {appointments.length === 0 ? (
        <div className="pn-card flex flex-col items-center rounded-3xl px-6 py-10 text-center">
          <span className="pn-g-brand mb-3 grid h-12 w-12 place-items-center rounded-2xl text-white">
            <CalendarPlus className="h-6 w-6" />
          </span>
          <p className="font-bold" style={{ color: "var(--pn-fg)" }}>Nenhum agendamento neste dia</p>
          <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--pn-muted)" }}>
            Compartilhe seu link para os clientes agendarem ou toque em <strong>+</strong> para marcar um horário.
          </p>
          <Link href={`/painel/bloqueios?data=${date}`} className="pn-btn sm soft mt-4">
            <CalendarOff /> Bloquear este dia ou horário
          </Link>
        </div>
      ) : (
        <section>
          <div className="pn-sec">
            <h3>Dia completo</h3>
            <span>
              {appointments.length} horário{appointments.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul>
            {appointments.map((a, i) => {
              const s = STATUS[a.status] ?? { label: a.status, color: "#a1a1aa" };
              const done = a.status === "CANCELED" || a.status === "NO_SHOW" || a.status === "COMPLETED";
              const isNext = a.id === next?.id;
              return (
                <li key={a.id} className="pn-it" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                  <div className="pn-tm">
                    <b>{minutesToTime(a.startMinutes)}</b>
                    <small>{minutesToTime(a.endMinutes)}</small>
                  </div>
                  <div className={`pn-appt pn-card ${a.status === "CANCELED" || a.status === "NO_SHOW" ? "off" : ""} ${isNext ? "is-next" : ""}`} style={{ ["--c" as string]: s.color }}>
                    <div className="r1">
                      <b>{a.client.name}</b>
                      <span className="pn-badge">{s.label}</span>
                    </div>
                    <small>
                      {a.service.name} · {a.professional.name} · {formatMoney(a.priceCents)}
                    </small>
                    {a.notes && <p className="note">“{a.notes}”</p>}
                    {!isNext && (
                      <div className="pn-mini">
                        {a.status === "SCHEDULED" && (
                          <StatusForm id={a.id} status="CONFIRMED" className="pn-btn sm pn-g-green">
                            <Check /> Confirmar
                          </StatusForm>
                        )}
                        {a.status === "CONFIRMED" && (
                          <StatusForm id={a.id} status="COMPLETED" className="pn-btn sm pn-g-green">
                            <CheckCheck /> Concluir
                          </StatusForm>
                        )}
                        {done && (
                          <StatusForm id={a.id} status="CONFIRMED" className="pn-btn sm soft">
                            <RotateCcw /> Reabrir
                          </StatusForm>
                        )}
                        <a href={whatsappLink(a.client.phone, message(a))} target="_blank" className="pn-btn sm pn-g-wa" aria-label={`WhatsApp de ${a.client.name}`}>
                          <MessageCircle /> <span className="hidden min-[420px]:inline">WhatsApp</span>
                        </a>
                        {!done && <MoreMenu id={a.id} status={a.status} size="sm" />}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusForm({ id, status, className, children }: { id: string; status: string; className: string; children: React.ReactNode }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${className} w-full`}>{children}</button>
    </form>
  );
}

/** Menu ⋯ com Remarcar, Falta e Cancelar. */
function MoreMenu({ id, status, size }: { id: string; status: string; size: "sm" | "" }) {
  return (
    <details className="pn-more">
      <summary className={`pn-btn sq soft ${size}`} aria-label="Mais ações">
        <MoreHorizontal />
      </summary>
      <div className="pn-menu">
        {status === "SCHEDULED" && <MenuItem id={id} status="COMPLETED" icon={<CheckCheck />}>Concluir</MenuItem>}
        <Link href={`/painel/remarcar/${id}`}>
          <CalendarClock /> Remarcar
        </Link>
        <MenuItem id={id} status="NO_SHOW" icon={<UserX />}>Marcar falta</MenuItem>
        <MenuItem id={id} status="CANCELED" icon={<X />} danger>Cancelar</MenuItem>
      </div>
    </details>
  );
}

function MenuItem({ id, status, icon, danger, children }: { id: string; status: string; icon: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
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
