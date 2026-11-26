import Link from "next/link";
import { CalendarClock, CalendarOff, CalendarPlus, Check, CheckCheck, ChevronLeft, ChevronRight, Lock, MessageCircle, MoreHorizontal, Phone, RotateCcw, UserX, X } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { addDays, formatDateLong, isValidDate, minutesToTime, nowInTimezone, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { EmptyState, FormMessage, StatusBadge } from "@/components/ui";
import { updateAppointmentStatus } from "@/app/painel/actions";
import { DatePickerButton } from "./agenda-controls";
import { blockAppliesOn } from "@/lib/schedule";
import { blockTime } from "@/lib/blocks";

type Props = { searchParams: Promise<{ data?: string; profissional?: string; erro?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const now = nowInTimezone();
  const today = now.date;
  const date = params.data && isValidDate(params.data) ? params.data : today;
  const pro = params.profissional || "";

  const [appointments, professionals, dayBlocks] = await Promise.all([
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
  ]);
  const blocks = dayBlocks
    .filter((b) => blockAppliesOn(b, date, weekdayOf(date)))
    .sort((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1));

  const active = appointments.filter((a) => a.status !== "CANCELED");
  const revenue = active.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + a.priceCents, 0);
  const lost = appointments.filter((a) => a.status === "CANCELED" || a.status === "NO_SHOW").length;
  const href = (d: string, p = pro) => `/painel?data=${d}${p ? `&profissional=${p}` : ""}`;
  // Próximo atendimento (destaque), só no dia de hoje
  const nextId =
    date === today
      ? appointments.find((a) => a.endMinutes > now.minutes && (a.status === "SCHEDULED" || a.status === "CONFIRMED"))?.id
      : undefined;
  // Faixa de dias: 3 antes e 10 depois da data escolhida
  const days = Array.from({ length: 14 }, (_, i) => addDays(date, i - 3));

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">Agenda</h1>
          <p className="text-sm text-zinc-500 first-letter:uppercase">
            {formatDateLong(date)}
            {date === today && " · hoje"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={href(addDays(date, -1))} className="btn-icon hidden md:inline-flex" aria-label="Dia anterior">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {date !== today && (
            <Link href={href(today)} className="btn-secondary btn-sm">Hoje</Link>
          )}
          <Link href={href(addDays(date, 1))} className="btn-icon hidden md:inline-flex" aria-label="Próximo dia">
            <ChevronRight className="h-5 w-5" />
          </Link>
          <DatePickerButton date={date} professional={pro} />
          <Link href={`/painel/novo?data=${date}`} className="btn-primary hidden md:inline-flex">
            <CalendarPlus className="h-4 w-4" /> Novo agendamento
          </Link>
        </div>
      </div>

      {/* Faixa de dias */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {days.map((d) => {
          const selected = d === date;
          return (
            <Link
              key={d}
              href={href(d)}
              className={`flex w-[52px] shrink-0 flex-col items-center rounded-2xl border py-2 transition ${
                selected
                  ? "border-navy-900 bg-navy-900 text-white shadow-md"
                  : "border-zinc-200 bg-white text-zinc-700 active:bg-zinc-50"
              }`}
            >
              <span className={`text-[11px] font-medium uppercase ${selected ? "text-white/70" : "text-zinc-400"}`}>
                {d === today ? "Hoje" : WEEKDAYS_SHORT[weekdayOf(d)]}
              </span>
              <span className="font-display text-lg font-extrabold leading-tight">{Number(d.slice(8))}</span>
            </Link>
          );
        })}
      </div>

      {/* Filtro por profissional */}
      {professionals.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {[{ id: "", name: "Todos" }, ...professionals].map((p) => (
            <Link
              key={p.id || "todos"}
              href={href(date, p.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                pro === p.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {/* Resumo do dia */}
      <div className="card mb-4 grid grid-cols-3 divide-x divide-zinc-100">
        <Stat label="Agendados" value={String(active.length)} />
        <Stat label="Previsto" value={formatMoney(revenue).replace(",00", "")} />
        <Stat label="Cancel./faltas" value={String(lost)} />
      </div>

      {params.erro === "conflito" && (
        <div className="mb-4">
          <FormMessage error="Não foi possível reabrir: o horário já está ocupado por outro agendamento." />
        </div>
      )}

      {/* Bloqueios do dia */}
      {blocks.length > 0 && (
        <ul className="mb-3 space-y-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/70 px-3.5 py-2.5 text-sm">
              <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="min-w-0 flex-1 truncate text-zinc-600">
                <strong className="font-semibold text-zinc-700 first-letter:uppercase">{blockTime(b)}</strong>
                {" · "}
                {b.professional?.name ?? "Todos"}
                {b.reason && ` · ${b.reason}`}
              </span>
              <Link href="/painel/bloqueios" className="shrink-0 text-xs font-semibold text-brand-700">Ver</Link>
            </li>
          ))}
        </ul>
      )}

      {appointments.length === 0 ? (
        <EmptyState title="Nenhum agendamento neste dia" icon={<CalendarPlus className="h-6 w-6" />}>
          Compartilhe seu link para os clientes agendarem ou toque em <strong>+ Novo</strong> para marcar um horário.
          <Link href={`/painel/bloqueios?data=${date}`} className="mt-3 flex items-center justify-center gap-1.5 font-semibold text-brand-700">
            <CalendarOff className="h-4 w-4" /> Bloquear este dia ou horário
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {appointments.map((a) => {
            const done = a.status === "CANCELED" || a.status === "NO_SHOW" || a.status === "COMPLETED";
            const isNext = a.id === nextId;
            const msg =
              `Olá, ${a.client.name.split(" ")[0]}! Passando para confirmar seu horário na ${user.business.name}: ` +
              `${a.service.name} com ${a.professional.name}, ${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}. Podemos confirmar?`;
            return (
              <li
                key={a.id}
                className={`card flex gap-3 p-3.5 ${done ? "opacity-60" : ""} ${isNext ? "border-brand-300 ring-2 ring-brand-100" : ""}`}
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="font-display text-lg font-extrabold leading-tight text-navy-900">{minutesToTime(a.startMinutes)}</p>
                  <p className="text-xs text-zinc-400">{minutesToTime(a.endMinutes)}</p>
                  {isNext && <p className="mt-1 text-[10px] font-bold uppercase text-brand-600">Próximo</p>}
                </div>
                <div className="min-w-0 flex-1 border-l border-zinc-100 pl-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-navy-900">{a.client.name}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="truncate text-sm text-zinc-500">
                    {a.service.name} · {a.professional.name}
                  </p>
                  <p className="text-sm font-medium text-zinc-700">{formatMoney(a.priceCents)}</p>
                  {a.notes && <p className="mt-1 rounded-lg bg-zinc-50 px-2 py-1 text-xs text-zinc-600">“{a.notes}”</p>}

                  <div className="mt-2.5 flex items-center gap-2">
                    {a.status === "SCHEDULED" && (
                      <StatusForm id={a.id} status="CONFIRMED" className="btn-navy btn-sm flex-1 sm:flex-none">
                        <Check className="h-4 w-4" /> Confirmar
                      </StatusForm>
                    )}
                    {a.status === "CONFIRMED" && (
                      <StatusForm id={a.id} status="COMPLETED" className="btn-navy btn-sm flex-1 sm:flex-none">
                        <CheckCheck className="h-4 w-4" /> Concluir
                      </StatusForm>
                    )}
                    {done && (
                      <StatusForm id={a.id} status="SCHEDULED" className="btn-secondary btn-sm flex-1 sm:flex-none">
                        <RotateCcw className="h-4 w-4" /> Reabrir
                      </StatusForm>
                    )}
                    <a
                      href={whatsappLink(a.client.phone, msg)}
                      target="_blank"
                      className="btn-sm btn border border-emerald-200 bg-emerald-50 text-emerald-700"
                      aria-label={`WhatsApp de ${a.client.name}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                    <a href={`tel:+${a.client.phone}`} className="btn-secondary btn-sm" aria-label={`Ligar para ${a.client.name}`}>
                      <Phone className="h-4 w-4" />
                      <span className="hidden sm:inline">{formatPhone(a.client.phone)}</span>
                    </a>
                    {!done && (
                      <details className="relative">
                        <summary className="btn-secondary btn-sm list-none [&::-webkit-details-marker]:hidden" aria-label="Mais ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                          {a.status === "SCHEDULED" && (
                            <MenuItem id={a.id} status="COMPLETED" icon={<CheckCheck className="h-4 w-4" />}>Concluir</MenuItem>
                          )}
                          <Link href={`/painel/remarcar/${a.id}`} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                            <CalendarClock className="h-4 w-4" /> Remarcar
                          </Link>
                          <MenuItem id={a.id} status="NO_SHOW" icon={<UserX className="h-4 w-4" />}>Marcar falta</MenuItem>
                          <MenuItem id={a.id} status="CANCELED" icon={<X className="h-4 w-4" />} danger>Cancelar</MenuItem>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="font-display text-xl font-extrabold text-navy-900">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
}

function StatusForm({ id, status, className, children }: { id: string; status: string; className: string; children: React.ReactNode }) {
  return (
    <form action={updateAppointmentStatus} className={className.includes("flex-1") ? "flex flex-1 sm:flex-none" : undefined}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${className} w-full`}>{children}</button>
    </form>
  );
}

function MenuItem({ id, status, icon, danger, children }: { id: string; status: string; icon: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 ${danger ? "text-red-600" : "text-zinc-700"}`}>
        {icon} {children}
      </button>
    </form>
  );
}
