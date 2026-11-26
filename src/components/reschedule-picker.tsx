"use client";

import { useActionState, useState } from "react";
import { addDays, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { useSlots } from "./use-slots";
import { FormMessage } from "./ui";
import { SubmitButton } from "./submit-button";
import { ClosedPeriods, NoSlots } from "./slot-notes";

type State = { error?: string | null } | undefined;

/** Escolha de novo dia e horário para um agendamento (usado pelo cliente e pelo dono). */
export function ReschedulePicker({
  action,
  hidden,
  slug,
  serviceId,
  professionalId,
  today,
  days: dayCount,
  openWeekdays,
  token,
  appointmentId,
  painel,
  notify,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  hidden: Record<string, string>;
  slug: string;
  serviceId: string;
  professionalId: string;
  today: string;
  days: number;
  openWeekdays: number[];
  token?: string;
  appointmentId?: string;
  painel?: boolean;
  /** Mostra a opção de avisar o cliente no WhatsApp (só no painel) */
  notify?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<number>();
  const { slots, loading, message, closed } = useSlots({ slug, serviceId, professionalId, date, painel, token, appointmentId });
  const days = Array.from({ length: dayCount + 1 }, (_, i) => addDays(today, i));

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="date" value={date ?? ""} />
      <input type="hidden" name="time" value={time ?? ""} />

      <div>
        <p className="label">Novo dia</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {days.map((d) => {
            const wd = weekdayOf(d);
            const closed = !openWeekdays.includes(wd);
            const selected = d === date;
            return (
              <button
                key={d}
                type="button"
                disabled={closed}
                onClick={() => {
                  setDate(d);
                  setTime(undefined);
                }}
                className={`flex w-[52px] shrink-0 flex-col items-center rounded-2xl border py-2 transition ${
                  selected
                    ? "border-navy-900 bg-navy-900 text-white"
                    : closed
                      ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
                      : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                <span className={`text-[11px] font-medium uppercase ${selected ? "text-white/70" : ""}`}>{d === today ? "Hoje" : WEEKDAYS_SHORT[wd]}</span>
                <span className="font-display text-lg font-extrabold leading-tight">{Number(d.slice(8))}</span>
              </button>
            );
          })}
        </div>
      </div>

      {date && (
        <div>
          <p className="label">Novo horário</p>
          {loading ? (
            <p className="text-sm text-zinc-500">Buscando horários...</p>
          ) : slots.length === 0 ? (
            <NoSlots message={message} />
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  onClick={() => setTime(s.time)}
                  className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                    time === s.time ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-200 bg-white text-navy-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {!loading && slots.length > 0 && <ClosedPeriods closed={closed} />}
        </div>
      )}

      {notify && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-brand-600" />
          Avisar o cliente no WhatsApp
        </label>
      )}

      <FormMessage error={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Remarcando...">
        {date && time !== undefined ? `Confirmar ${slots.find((s) => s.time === time)?.label ?? ""}` : "Escolha dia e horário"}
      </SubmitButton>
    </form>
  );
}
