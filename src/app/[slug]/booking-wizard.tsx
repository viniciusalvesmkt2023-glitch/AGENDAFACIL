"use client";

import { useActionState, useMemo, useState } from "react";
import { bookOnline } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useSlots } from "@/components/use-slots";
import { addDays, formatDateLong, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatDuration, formatMoney } from "@/lib/format";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number };
type Professional = { id: string; name: string; serviceIds: string[] };

type Props = {
  slug: string;
  today: string;
  maxAdvanceDays: number;
  openWeekdays: number[];
  services: Service[];
  professionals: Professional[];
};

const ANY = "__any__";

export function BookingWizard({ slug, today, maxAdvanceDays, openWeekdays, services, professionals }: Props) {
  const [state, action] = useActionState(bookOnline, undefined);
  const [serviceId, setServiceId] = useState<string>();
  const [professionalId, setProfessionalId] = useState<string>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<number>();

  const service = services.find((s) => s.id === serviceId);
  const pros = useMemo(() => professionals.filter((p) => serviceId && p.serviceIds.includes(serviceId)), [professionals, serviceId]);
  const pro = pros.find((p) => p.id === professionalId);

  const { slots, loading } = useSlots({
    slug,
    serviceId: professionalId ? serviceId : undefined,
    professionalId: professionalId === ANY ? undefined : professionalId,
    date,
  });

  const days = useMemo(
    () => Array.from({ length: maxAdvanceDays + 1 }, (_, i) => addDays(today, i)),
    [today, maxAdvanceDays],
  );

  const step = !serviceId ? 1 : !professionalId ? 2 : time === undefined ? 3 : 4;

  return (
    <div className="space-y-4">
      {/* 1. Serviço */}
      <Step n={1} title="Escolha o serviço" active={step === 1} done={!!service} summary={service?.name} onEdit={() => {
        setServiceId(undefined); setProfessionalId(undefined); setTime(undefined);
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServiceId(s.id);
                const available = professionals.filter((p) => p.serviceIds.includes(s.id));
                setProfessionalId(available.length === 1 ? available[0].id : undefined);
                setTime(undefined);
              }}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-sm"
            >
              <p className="font-medium">{s.name}</p>
              {s.description && <p className="mt-1 text-sm text-zinc-500">{s.description}</p>}
              <p className="mt-2 text-sm">
                <span className="font-semibold text-brand-700">{formatMoney(s.priceCents)}</span>
                <span className="text-zinc-400"> · {formatDuration(s.durationMinutes)}</span>
              </p>
            </button>
          ))}
        </div>
      </Step>

      {/* 2. Profissional */}
      {serviceId && (
        <Step
          n={2}
          title="Escolha o profissional"
          active={step === 2}
          done={!!professionalId}
          summary={professionalId === ANY ? "Sem preferência" : pro?.name}
          onEdit={() => { setProfessionalId(undefined); setTime(undefined); }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {pros.length > 1 && (
              <ProCard name="Sem preferência" hint="Primeiro disponível" onClick={() => { setProfessionalId(ANY); setTime(undefined); }} />
            )}
            {pros.map((p) => (
              <ProCard key={p.id} name={p.name} onClick={() => { setProfessionalId(p.id); setTime(undefined); }} />
            ))}
          </div>
        </Step>
      )}

      {/* 3. Data e horário */}
      {professionalId && (
        <Step
          n={3}
          title="Escolha data e horário"
          active={step === 3}
          done={time !== undefined}
          summary={date && time !== undefined ? `${formatDateLong(date)} às ${slots.find((s) => s.time === time)?.label ?? ""}` : undefined}
          onEdit={() => setTime(undefined)}
        >
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((d) => {
              const wd = weekdayOf(d);
              const closed = !openWeekdays.includes(wd);
              const selected = d === date;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={closed}
                  onClick={() => { setDate(d); setTime(undefined); }}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-sm transition ${
                    selected
                      ? "border-brand-600 bg-brand-600 text-white"
                      : closed
                        ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
                        : "border-zinc-200 bg-white hover:border-brand-500"
                  }`}
                >
                  <span className="text-xs">{d === today ? "Hoje" : WEEKDAYS_SHORT[wd]}</span>
                  <span className="text-lg font-semibold">{d.slice(8)}</span>
                  <span className="text-xs">{d.slice(5, 7)}</span>
                </button>
              );
            })}
          </div>
          {date && (
            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-zinc-500">Buscando horários...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum horário livre nesta data. Tente outro dia.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setTime(s.time)}
                      className="rounded-lg border border-zinc-200 bg-white py-2 text-sm font-medium transition hover:border-brand-500 hover:text-brand-700"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Step>
      )}

      {/* 4. Dados do cliente */}
      {step === 4 && service && date && (
        <Step n={4} title="Seus dados" active done={false}>
          <form action={action} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="serviceId" value={service.id} />
            <input type="hidden" name="professionalId" value={professionalId === ANY ? "" : professionalId} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="time" value={time} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="clientName">Nome</label>
                <input className="input" id="clientName" name="clientName" required autoComplete="name" defaultValue={state?.values?.clientName} />
              </div>
              <div>
                <label className="label" htmlFor="clientPhone">WhatsApp com DDD</label>
                <input className="input" id="clientPhone" name="clientPhone" required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" defaultValue={state?.values?.clientPhone} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="notes">Observação (opcional)</label>
              <input className="input" id="notes" name="notes" maxLength={500} defaultValue={state?.values?.notes} />
            </div>
            <div className="rounded-lg bg-zinc-50 p-4 text-sm">
              <p><strong>{service.name}</strong> · {formatDuration(service.durationMinutes)}</p>
              <p className="text-zinc-600">
                {formatDateLong(date)} às {slots.find((s) => s.time === time)?.label}
                {pro ? ` com ${pro.name}` : ""}
              </p>
              <p className="mt-1 font-semibold">{formatMoney(service.priceCents)}</p>
            </div>
            <p className="text-xs text-zinc-500">
              Seus dados serão usados para gerenciar o agendamento e enviar confirmação e lembretes pelo WhatsApp. Veja a{" "}
              <a href="/privacidade" target="_blank" className="underline">Política de Privacidade</a>.
            </p>
            <FormMessage error={state?.error} />
            <SubmitButton className="btn-primary w-full py-3 text-base" pendingText="Confirmando...">
              Confirmar agendamento
            </SubmitButton>
          </form>
        </Step>
      )}
    </div>
  );
}

function Step({
  n, title, active, done, summary, onEdit, children,
}: {
  n: number; title: string; active: boolean; done: boolean; summary?: string; onEdit?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${done && !active ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"}`}>
          {done && !active ? "✓" : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {!active && summary && <p className="truncate text-sm text-zinc-500">{summary}</p>}
        </div>
        {!active && done && onEdit && (
          <button type="button" onClick={onEdit} className="text-sm font-medium text-brand-700 hover:underline">Alterar</button>
        )}
      </div>
      {active && <div className="mt-4">{children}</div>}
    </section>
  );
}

function ProCard({ name, hint, onClick }: { name: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-brand-500">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
        {hint ? "★" : name.charAt(0).toUpperCase()}
      </span>
      <span>
        <span className="block font-medium">{name}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </button>
  );
}
