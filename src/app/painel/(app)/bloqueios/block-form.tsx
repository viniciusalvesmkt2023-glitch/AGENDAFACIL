"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBlock } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Switch } from "@/components/switch";
import { WEEKDAYS_SHORT } from "@/lib/time";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function BlockForm({ professionals, today, defaultDate }: { professionals: { id: string; name: string }[]; today: string; defaultDate: string }) {
  const [state, action] = useActionState(createBlock, undefined);
  const [kind, setKind] = useState<"ONCE" | "WEEKLY">("ONCE");
  const [allDay, setAllDay] = useState(false);
  const [period, setPeriod] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) setWeekdays([]);
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {weekdays.map((d) => (
        <input key={d} type="hidden" name="weekdays" value={d} />
      ))}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
        {(
          [
            ["ONCE", "Uma data"],
            ["WEEKLY", "Toda semana"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${kind === k ? "bg-white text-navy-900 shadow-sm" : "text-zinc-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="professionalId">Quem</label>
        <select className="input" id="professionalId" name="professionalId" defaultValue="">
          <option value="">Todos (estabelecimento fechado)</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {kind === "ONCE" ? (
        <div className="space-y-2">
          <div className={period ? "grid grid-cols-2 gap-2" : ""}>
            <label className="block">
              <span className="label">{period ? "De" : "Data"}</span>
              <input className="input" type="date" name="date" min={today} defaultValue={defaultDate} required />
            </label>
            {period && (
              <label className="block">
                <span className="label">Até</span>
                <input className="input" type="date" name="endDate" min={today} required />
              </label>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={period} onChange={(e) => setPeriod(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Vários dias seguidos (férias, viagem)
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="label">Dias da semana</span>
            <div className="grid grid-cols-7 gap-1.5">
              {ORDER.map((d) => {
                const on = weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWeekdays((l) => (on ? l.filter((x) => x !== d) : [...l, d]))}
                    className={`rounded-xl py-2.5 text-sm font-bold transition ${on ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    {WEEKDAYS_SHORT[d]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">A partir de</span>
              <input className="input" type="date" name="date" defaultValue={today} required />
            </label>
            <label className="block">
              <span className="label">Até (opcional)</span>
              <input className="input" type="date" name="endDate" min={today} />
            </label>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-zinc-50 p-3">
        <div className="flex items-center gap-3">
          <Switch name="allDay" label="Dia inteiro" checked={allDay} onChange={setAllDay} />
          <span className="font-medium text-navy-900">Dia inteiro</span>
        </div>
        <div className={allDay ? "hidden" : "mt-3 grid grid-cols-2 gap-2"}>
          <label className="block">
            <span className="label">Das</span>
            <input className="input" type="time" name="start" defaultValue="12:00" />
          </label>
          <label className="block">
            <span className="label">Até</span>
            <input className="input" type="time" name="end" defaultValue="13:00" />
          </label>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="reason">Motivo (opcional, só você vê)</label>
        <input className="input" id="reason" name="reason" maxLength={80} placeholder="Ex.: médico, folga, curso" />
      </div>

      <FormMessage error={state?.error} success={state?.success} />
      {state?.warning && <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{state.warning}</p>}
      <SubmitButton className="btn-primary w-full">Bloquear</SubmitButton>
    </form>
  );
}
