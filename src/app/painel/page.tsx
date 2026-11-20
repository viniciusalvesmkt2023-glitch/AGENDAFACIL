import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addDays, formatDateLong, isValidDate, minutesToTime, todayInTimezone } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { EmptyState, FormMessage, PageHeader, StatusBadge } from "@/components/ui";
import { updateAppointmentStatus } from "./actions";

type Props = { searchParams: Promise<{ data?: string; profissional?: string; erro?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayInTimezone();
  const date = params.data && isValidDate(params.data) ? params.data : today;
  const professionalFilter = params.profissional || "";

  const [appointments, professionals] = await Promise.all([
    db.appointment.findMany({
      where: {
        businessId: user.businessId,
        date,
        ...(professionalFilter ? { professionalId: professionalFilter } : {}),
      },
      include: { client: true, service: true, professional: true },
      orderBy: [{ startMinutes: "asc" }],
    }),
    db.professional.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
  ]);

  const active = appointments.filter((a) => a.status !== "CANCELED");
  const revenue = active.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + a.priceCents, 0);
  const qs = (d: string) => `/painel?data=${d}${professionalFilter ? `&profissional=${professionalFilter}` : ""}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        description={`${formatDateLong(date)}${date === today ? " (hoje)" : ""}`}
        action={
          <Link href={`/painel/novo?data=${date}`} className="btn-primary">
            + Novo agendamento
          </Link>
        }
      />

      {params.erro === "conflito" && (
        <div className="mb-4">
          <FormMessage error="Não foi possível reabrir: o horário já está ocupado por outro agendamento." />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={qs(addDays(date, -1))} className="btn-secondary px-3" aria-label="Dia anterior">←</Link>
        <Link href={qs(today)} className="btn-secondary">Hoje</Link>
        <Link href={qs(addDays(date, 1))} className="btn-secondary px-3" aria-label="Próximo dia">→</Link>
        <form className="flex flex-wrap items-center gap-2" action="/painel">
          <input type="date" name="data" defaultValue={date} className="input w-auto" />
          <select name="profissional" defaultValue={professionalFilter} className="input w-auto">
            <option value="">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn-secondary">Filtrar</button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Agendamentos</p>
          <p className="mt-1 text-2xl font-semibold">{active.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500">Faturamento previsto</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(revenue)}</p>
        </div>
        <div className="card hidden p-4 sm:block">
          <p className="text-xs text-zinc-500">Cancelados / faltas</p>
          <p className="mt-1 text-2xl font-semibold">
            {appointments.filter((a) => a.status === "CANCELED" || a.status === "NO_SHOW").length}
          </p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState title="Nenhum agendamento neste dia.">
          Compartilhe seu link de agendamento com os clientes ou crie um agendamento manual.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {appointments.map((a) => {
            const time = `${minutesToTime(a.startMinutes)} – ${minutesToTime(a.endMinutes)}`;
            const msg =
              `Olá, ${a.client.name.split(" ")[0]}! Passando para confirmar seu horário na ${user.business.name}: ` +
              `${a.service.name} com ${a.professional.name}, ${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}. ` +
              `Podemos confirmar?`;
            const muted = a.status === "CANCELED" ? "opacity-60" : "";
            return (
              <li key={a.id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${muted}`}>
                <div className="w-28 shrink-0">
                  <p className="font-semibold">{time}</p>
                  <p className="text-xs text-zinc-500">{a.professional.name}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.client.name}</p>
                    <StatusBadge status={a.status} />
                    {a.source === "MANUAL" && <span className="text-xs text-zinc-400">manual</span>}
                  </div>
                  <p className="text-sm text-zinc-500">
                    {a.service.name} · {formatMoney(a.priceCents)} · {formatPhone(a.client.phone)}
                  </p>
                  {a.notes && <p className="mt-1 text-sm text-zinc-500">Obs.: {a.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={whatsappLink(a.client.phone, msg)} target="_blank" className="btn-secondary px-3 py-1.5 text-xs">
                    WhatsApp
                  </a>
                  {a.status === "SCHEDULED" && <StatusButton id={a.id} status="CONFIRMED" label="Confirmar" />}
                  {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                    <>
                      <StatusButton id={a.id} status="COMPLETED" label="Concluir" />
                      <StatusButton id={a.id} status="NO_SHOW" label="Faltou" />
                      <StatusButton id={a.id} status="CANCELED" label="Cancelar" danger />
                    </>
                  )}
                  {(a.status === "CANCELED" || a.status === "NO_SHOW" || a.status === "COMPLETED") && (
                    <StatusButton id={a.id} status="SCHEDULED" label="Reabrir" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StatusButton({ id, status, label, danger }: { id: string; status: string; label: string; danger?: boolean }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${danger ? "btn-danger" : "btn-secondary"} px-3 py-1.5 text-xs`}>{label}</button>
    </form>
  );
}
