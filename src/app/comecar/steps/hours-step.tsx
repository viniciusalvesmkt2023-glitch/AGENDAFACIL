"use client";

import { useActionState, useState } from "react";
import { saveHoursStep } from "../actions";
import { StepFooter } from "../step-ui";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Switch } from "@/components/switch";
import { WEEKDAYS_SHORT } from "@/lib/time";

export type HoursInitial = {
  days: number[];
  start: string;
  end: string;
  lunch: boolean;
  lunchStart: string;
  lunchEnd: string;
  satDiff: boolean;
  satStart: string;
  satEnd: string;
};

const PRESETS = [
  { label: "Seg a Sex", days: [1, 2, 3, 4, 5] },
  { label: "Seg a Sáb", days: [1, 2, 3, 4, 5, 6] },
  { label: "Ter a Sáb", days: [2, 3, 4, 5, 6] },
  { label: "Todos os dias", days: [0, 1, 2, 3, 4, 5, 6] },
];
// Segunda primeiro, domingo no fim (como as pessoas pensam a semana)
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Resumo em texto, ex.: "Seg a Sáb" ou "Seg, Qua e Sex". */
function daysText(days: number[]) {
  const sorted = ORDER.filter((d) => days.includes(d));
  const preset = PRESETS.find((p) => p.days.length === sorted.length && p.days.every((d) => sorted.includes(d)));
  if (preset) return preset.label;
  const names = sorted.map((d) => WEEKDAYS_SHORT[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}` : names[0] ?? "nenhum dia";
}

export function HoursStep({ initial }: { initial: HoursInitial }) {
  const [state, action] = useActionState(saveHoursStep, undefined);
  const [days, setDays] = useState<number[]>(initial.days);
  const [lunch, setLunch] = useState(initial.lunch);
  const [satDiff, setSatDiff] = useState(initial.satDiff);
  const toggle = (d: number) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

  return (
    <form action={action} className="space-y-4">
      {days.map((d) => (
        <input key={d} type="hidden" name="days" value={d} />
      ))}

      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">Dias de atendimento</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDays(p.days)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                same(days, p.days) ? "border-navy-900 bg-navy-900 text-white" : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {ORDER.map((d) => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(d)}
                className={`rounded-xl py-2.5 text-sm font-bold transition ${on ? "bg-brand-500 text-white shadow-sm" : "bg-zinc-100 text-zinc-500"}`}
              >
                {WEEKDAYS_SHORT[d]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">Horário</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0">
            <span className="label">Abre às</span>
            <input type="time" name="start" defaultValue={initial.start} className="input" required />
          </label>
          <label className="min-w-0">
            <span className="label">Fecha às</span>
            <input type="time" name="end" defaultValue={initial.end} className="input" required />
          </label>
        </div>

        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="flex items-center gap-3">
            <Switch name="lunch" label="Pausa para almoço" checked={lunch} onChange={setLunch} />
            <span className="font-medium text-navy-900">Pausa para almoço</span>
          </div>
          <div className={lunch ? "mt-3 grid grid-cols-2 gap-2" : "hidden"}>
            <label className="min-w-0">
              <span className="label">Das</span>
              <input type="time" name="lunchStart" defaultValue={initial.lunchStart} className="input" />
            </label>
            <label className="min-w-0">
              <span className="label">Até</span>
              <input type="time" name="lunchEnd" defaultValue={initial.lunchEnd} className="input" />
            </label>
          </div>
        </div>

        {days.includes(6) && (
          <div className="rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center gap-3">
              <Switch name="satDiff" label="Sábado com horário diferente" checked={satDiff} onChange={setSatDiff} />
              <span className="font-medium text-navy-900">Sábado com horário diferente</span>
            </div>
            <div className={satDiff ? "mt-3 grid grid-cols-2 gap-2" : "hidden"}>
              <label className="min-w-0">
                <span className="label">Abre às</span>
                <input type="time" name="satStart" defaultValue={initial.satStart} className="input" />
              </label>
              <label className="min-w-0">
                <span className="label">Fecha às</span>
                <input type="time" name="satEnd" defaultValue={initial.satEnd} className="input" />
              </label>
            </div>
          </div>
        )}
      </section>

      <p className="text-sm text-zinc-500">
        Atendimento: <strong className="text-navy-900">{daysText(days)}</strong>. Depois você pode ajustar cada dia
        separadamente em <em>Horários</em>.
      </p>

      <FormMessage error={state?.error} />
      <StepFooter back="/comecar?passo=2">
        <SubmitButton className="btn-primary w-full md:w-auto md:px-8">Continuar</SubmitButton>
      </StepFooter>
    </form>
  );
}
