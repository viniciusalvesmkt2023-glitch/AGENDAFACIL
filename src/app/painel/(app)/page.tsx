import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  CalendarRange,
  Clock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  List,
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
import { blockAppliesOn, blockIntervals, effectiveHours } from "@/lib/schedule";
import { blockTime } from "@/lib/blocks";
import { computeAvailableSlots } from "@/lib/availability";
import { TIMEZONE } from "@/lib/time";
import { AgendaCalendar, type CalColumn } from "./agenda-calendar";
import "./agenda.css";

type Props = { searchParams: Promise<{ data?: string; profissional?: string; erro?: string; ver?: string; cancelados?: string }> };
type View = "dia" | "semana" | "lista";

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
  const view: View = params.ver === "semana" || params.ver === "lista" ? params.ver : "dia";
  const showCanceled = params.cancelados === "1";
  const allPros = await db.professional.findMany({
    where: { businessId: user.businessId, active: true },
    include: { hours: true },
    orderBy: { name: "asc" },
  });
  const professionals = allPros;
  // A semana mostra um profissional por vez (com todos juntos as colunas ficam estreitas demais)
  const pro = params.profissional || (view === "semana" ? (allPros[0]?.id ?? "") : "");
  // Faixa de dias: 3 antes e 10 depois da data escolhida
  const days = Array.from({ length: 14 }, (_, i) => addDays(date, i - 3));
  const weekStart = addDays(date, -weekdayOf(date));
  const range = view === "semana" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [date];
  const first = range[0];
  const last = range[range.length - 1];

  const [rangeAppointments, rangeBlocks, perDay, businessHours] = await Promise.all([
    db.appointment.findMany({
      where: { businessId: user.businessId, date: { in: range }, ...(pro ? { professionalId: pro } : {}) },
      include: { client: true, service: true, professional: true },
      orderBy: [{ startMinutes: "asc" }],
    }),
    db.timeBlock.findMany({
      where: {
        businessId: user.businessId,
        date: { lte: last },
        OR: [{ endDate: null }, { endDate: { gte: first } }],
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
    db.workingHour.findMany({ where: { businessId: user.businessId } }),
  ]);
  const appointments = rangeAppointments.filter((a) => a.date === date);
  const busyDays = new Set(perDay.map((d) => d.date));
  const blocks = rangeBlocks
    .filter((b) => blockAppliesOn(b, date, weekdayOf(date)))
    .sort((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1));

  // Resumo: o dia escolhido (Dia/Lista) ou a semana do profissional (Semana)
  const scoped = view === "semana" ? rangeAppointments : appointments;
  const active = scoped.filter((a) => a.status !== "CANCELED");
  const revenue = active.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + a.priceCents, 0);
  const lost = scoped.filter((a) => a.status === "CANCELED" || a.status === "NO_SHOW").length;
  const b = user.business;
  const shownPros = pro ? allPros.filter((p) => p.id === pro) : allPros;
  // Horários livres (de slotInterval em slotInterval) que ainda dá para agendar
  const free = range.reduce((sum, d) => {
    if (d < today) return sum;
    const wd = weekdayOf(d);
    return (
      sum +
      shownPros.reduce((acc, p) => {
        const busy = rangeAppointments
          .filter((a) => a.date === d && a.professionalId === p.id && a.status !== "CANCELED")
          .map((a) => ({ startMinutes: a.startMinutes, endMinutes: a.endMinutes }));
        return (
          acc +
          computeAvailableSlots({
            hours: effectiveHours(p, businessHours, wd),
            durationMinutes: b.slotInterval,
            slotInterval: b.slotInterval,
            busy,
            blocks: blockIntervals(rangeBlocks, d, wd, p.id),
            bufferMinutes: b.bufferMinutes,
            earliestStart: d === today ? now.minutes : 0,
          }).length
        );
      }, 0)
    );
  }, 0);
  const qs = (o: { data?: string; p?: string; ver?: View; x?: boolean }) => {
    const v = o.ver ?? view;
    const q = new URLSearchParams();
    q.set("data", o.data ?? date);
    if (v !== "dia") q.set("ver", v);
    const pp = o.p ?? params.profissional ?? "";
    if (pp) q.set("profissional", pp);
    if (o.x ?? showCanceled) q.set("cancelados", "1");
    return `/painel?${q}`;
  };
  const href = (d: string, p = params.profissional ?? "") => qs({ data: d, p });
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

  const [, wm1, wd1] = range[0].split("-").map(Number);
  const [, wm2, wd2] = range[range.length - 1].split("-").map(Number);
  const weekLabel = wm1 === wm2 ? `${wd1} – ${wd2} de ${MONTHS[wm2 - 1]}` : `${wd1} ${MONTHS[wm1 - 1]} – ${wd2} ${MONTHS[wm2 - 1]}`;

  // ---------- Calendário (Dia: uma coluna por profissional · Semana: um dia por coluna) ----------
  const proIndex = new Map(allPros.map((p, i) => [p.id, i]));
  const toCal = (a: (typeof rangeAppointments)[number]) => ({
    id: a.id,
    date: a.date,
    start: a.startMinutes,
    end: a.endMinutes,
    status: a.status,
    client: a.client.name,
    phone: a.client.phone,
    service: a.service.name,
    price: formatMoney(a.priceCents).replace(",00", ""),
    professional: a.professional.name,
    notes: a.notes,
    waHref: whatsappLink(a.client.phone, message(a)),
  });
  const columnFor = (d: string, p: (typeof allPros)[number]): CalColumn => {
    const wd = weekdayOf(d);
    const h = effectiveHours(p, businessHours, wd);
    return {
      key: `${d}-${p.id}`,
      date: d,
      proId: p.id,
      head:
        view === "semana"
          ? { kind: "day", weekday: WEEKDAYS_SHORT[wd], day: Number(d.slice(8)), href: qs({ data: d, ver: "dia", p: "" }) }
          : { kind: "pro", name: p.name, img: p.imageId ? `/i/${p.imageId}` : null, color: AVATARS[(proIndex.get(p.id) ?? 0) % AVATARS.length] },
      hours: h && h.isOpen ? { start: h.startMinutes, end: h.endMinutes, breakStart: h.breakStart ?? null, breakEnd: h.breakEnd ?? null } : null,
      blocks: rangeBlocks
        .filter((bl) => (bl.professionalId === null || bl.professionalId === p.id) && blockAppliesOn(bl, d, wd))
        .map((bl) => ({ start: bl.startMinutes ?? 0, end: bl.endMinutes ?? 24 * 60, label: bl.reason || "Bloqueado" })),
      appts: rangeAppointments
        .filter((a) => a.date === d && a.professionalId === p.id && (showCanceled || a.status !== "CANCELED"))
        .map(toCal),
    };
  };
  // Profissional desativado que ainda tem horário marcado no dia também aparece
  const dayPros = [
    ...shownPros,
    ...[...new Map(appointments.filter((a) => !proIndex.has(a.professionalId) && (!pro || a.professionalId === pro)).map((a) => [a.professionalId, a.professional])).values()].map(
      (p) => ({ ...p, hours: [] as (typeof allPros)[number]["hours"] }),
    ),
  ];
  const columns: CalColumn[] =
    view === "semana" ? (shownPros[0] ? range.map((d) => columnFor(d, shownPros[0])) : []) : view === "dia" ? dayPros.map((p) => columnFor(date, p)) : [];
  // Faixa de horas: do primeiro horário de abertura (ou agendamento) até o último, de hora em hora
  const starts = columns.flatMap((c) => [c.hours?.start, ...c.appts.map((a) => a.start)]).filter((v): v is number => v != null);
  const ends = columns.flatMap((c) => [c.hours?.end, ...c.appts.map((a) => a.end)]).filter((v): v is number => v != null);
  const t0 = starts.length ? Math.max(0, Math.floor(Math.min(...starts) / 60) * 60) : 8 * 60;
  const t1 = ends.length ? Math.min(24 * 60, Math.max(t0 + 60, Math.ceil(Math.max(...ends) / 60) * 60)) : 18 * 60;

  return (
    <div className="space-y-4">
      {/* Saudação e data */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="pn-hello">
            {greeting(now.minutes)}, {firstName} 👋
          </p>
          <h1 className="pn-h1">
            {view === "semana" ? (
              <>
                Semana, <em>{weekLabel}</em>
              </>
            ) : (
              <>
                {date === today ? "Hoje" : WEEKDAY_NAMES[weekdayOf(date)]}, <em>{d} de {MONTHS[m - 1]}</em>
              </>
            )}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={href(addDays(date, view === "semana" ? -7 : -1))} className="pn-ib hidden md:grid" aria-label={view === "semana" ? "Semana anterior" : "Dia anterior"}>
            <ChevronLeft />
          </Link>
          {(view === "semana" ? !range.includes(today) : date !== today) && (
            <Link href={href(today)} className="pn-btn sm soft">
              Hoje
            </Link>
          )}
          <Link href={href(addDays(date, view === "semana" ? 7 : 1))} className="pn-ib hidden md:grid" aria-label={view === "semana" ? "Próxima semana" : "Próximo dia"}>
            <ChevronRight />
          </Link>
          <DatePickerButton date={date} professional={params.profissional ?? ""} view={view} />
          <Link href={`/painel/novo?data=${date}`} className="pn-btn pn-g-brand hidden md:inline-flex">
            <CalendarPlus /> Novo agendamento
          </Link>
        </div>
      </div>

      {/* Dia / Semana / Lista */}
      <nav className="ag-views" aria-label="Como ver a agenda">
        <Link href={qs({ ver: "dia", p: view === "semana" ? "" : undefined })} className={view === "dia" ? "on" : ""} aria-current={view === "dia" ? "page" : undefined}>
          <CalendarDays /> Dia
        </Link>
        <Link href={qs({ ver: "semana" })} className={view === "semana" ? "on" : ""} aria-current={view === "semana" ? "page" : undefined}>
          <CalendarRange /> Semana
        </Link>
        <Link href={qs({ ver: "lista", p: view === "semana" ? "" : undefined })} className={view === "lista" ? "on" : ""} aria-current={view === "lista" ? "page" : undefined}>
          <List /> Lista
        </Link>
      </nav>

      {/* Faixa de dias */}
      {view === "semana" ? (
        <div className="ag-weeknav">
          <Link href={href(addDays(date, -7))} className="pn-ib" aria-label="Semana anterior">
            <ChevronLeft />
          </Link>
          {weekLabel}
          <Link href={href(addDays(date, 7))} className="pn-ib" aria-label="Próxima semana">
            <ChevronRight />
          </Link>
        </div>
      ) : (
      <div className="pn-days">
        {days.map((day) => (
          <Link key={day} href={href(day)} className={`pn-day pn-card ${day === date ? "sel" : ""}`} aria-current={day === date ? "date" : undefined}>
            <small>{day === today ? "Hoje" : WEEKDAYS_SHORT[weekdayOf(day)]}</small>
            <b>{Number(day.slice(8))}</b>
            <i className={busyDays.has(day) ? "" : "no"} />
          </Link>
        ))}
      </div>
      )}

      {/* Resumo do dia (ou da semana) */}
      <div className="pn-stats ag-stats4">
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
          <div className="ic pn-g-purple"><Clock strokeWidth={2.4} /></div>
          <b>{free}</b>
          <small>Horários livres</small>
        </div>
        <div className="pn-st pn-card">
          <div className="ic pn-g-red"><X strokeWidth={2.6} /></div>
          <b>{lost}</b>
          <small>Cancel./faltas</small>
        </div>
      </div>

      {/* Filtro por profissional */}
      {(professionals.length > 1 || view !== "lista") && (
        <div className="pn-chips">
          {professionals.length > 1 && view !== "semana" && (
            <Link href={href(date, "")} className={`pn-chip plain pn-card ${pro === "" ? "on" : ""}`}>
              Todos
            </Link>
          )}
          {professionals.length > 1 &&
            professionals.map((p, i) => (
              <Link key={p.id} href={href(date, p.id)} className={`pn-chip pn-card ${pro === p.id ? "on" : ""}`}>
                {p.imageId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/i/${p.imageId}`} alt="" className="pn-av object-cover" />
                ) : (
                  <span className={`pn-av ${AVATARS[i % AVATARS.length]}`}>{p.name.charAt(0).toUpperCase()}</span>
                )}
                {p.name}
              </Link>
            ))}
          {view !== "lista" && (
            <Link href={qs({ x: !showCanceled })} className={`pn-chip plain pn-card ${showCanceled ? "on" : ""}`} data-testid="toggle-canceled">
              {showCanceled ? "✓ " : ""}Mostrar cancelados
            </Link>
          )}
        </div>
      )}

      {params.erro === "conflito" && <FormMessage error="Não foi possível reabrir: o horário já está ocupado por outro agendamento." />}

      {view !== "lista" ? (
        columns.length === 0 ? (
          <div className="pn-card flex flex-col items-center rounded-3xl px-6 py-10 text-center">
            <p className="font-bold" style={{ color: "var(--pn-fg)" }}>Cadastre um profissional para ver a agenda</p>
            <Link href="/painel/profissionais" className="pn-btn sm soft mt-4">Ir para Profissionais</Link>
          </div>
        ) : (
          <AgendaCalendar
            key={`${view}-${range[0]}-${pro}`}
            mode={view}
            columns={columns}
            t0={t0}
            t1={t1}
            today={today}
            timezone={TIMEZONE}
            initialNow={now.minutes}
            showProInBlock={false}
          />
        )
      ) : (
      <>
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
      </>
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
