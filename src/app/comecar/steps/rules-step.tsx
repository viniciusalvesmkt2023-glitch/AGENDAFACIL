"use client";

import { useActionState, useState } from "react";
import { Info } from "lucide-react";
import { saveRulesStep } from "../actions";
import { MAX_DAYS_OPTIONS, MIN_ADVANCE_OPTIONS, SLOT_OPTIONS } from "../config";
import { StepFooter } from "../step-ui";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { minutesToTime } from "@/lib/time";

type Props = {
  slotInterval: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  /** Abertura e almoço de um dia típico, para mostrar os horários de exemplo */
  dayStart: number;
  dayEnd: number;
  breakStart: number | null;
  breakEnd: number | null;
};

function Chips<T extends number>({ name, options, value, onChange }: { name: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 ${
            value === o.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function RulesStep(p: Props) {
  const [state, action] = useActionState(saveRulesStep, undefined);
  const [slot, setSlot] = useState(SLOT_OPTIONS.includes(p.slotInterval) ? p.slotInterval : 30);
  const [minAdv, setMinAdv] = useState(MIN_ADVANCE_OPTIONS.some((o) => o.value === p.minAdvanceMinutes) ? p.minAdvanceMinutes : 60);
  const [maxDays, setMaxDays] = useState(MAX_DAYS_OPTIONS.includes(p.maxAdvanceDays) ? p.maxAdvanceDays : 30);

  // Primeiros horários que o cliente vai ver num dia normal
  const sample: string[] = [];
  for (let t = p.dayStart; t < p.dayEnd && sample.length < 8; t += slot) {
    if (p.breakStart !== null && p.breakEnd !== null && t >= p.breakStart && t < p.breakEnd) continue;
    sample.push(minutesToTime(t));
  }
  const advText = MIN_ADVANCE_OPTIONS.find((o) => o.value === minAdv)?.text;

  return (
    <form action={action} className="space-y-4">
      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">De quanto em quanto tempo aparecem os horários?</h2>
        <p className="mt-0.5 text-sm text-zinc-500">60 minutos = só horas cheias.</p>
        <div className="mt-3">
          <Chips name="slotInterval" value={slot} onChange={setSlot} options={SLOT_OPTIONS.map((v) => ({ value: v, label: `${v} min` }))} />
        </div>
        <div className="mt-3 rounded-xl bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-500">Seu cliente vai ver horários assim:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sample.map((t) => (
              <span key={t} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-sm font-semibold text-navy-900">{t}</span>
            ))}
            <span className="px-1 py-1 text-sm text-zinc-400">…</span>
          </div>
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">Antecedência mínima</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Evita alguém marcar para daqui a 5 minutos sem você ver.</p>
        <div className="mt-3">
          <Chips name="minAdvanceMinutes" value={minAdv} onChange={setMinAdv} options={MIN_ADVANCE_OPTIONS} />
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">Até quantos dias pra frente?</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Até quando a agenda fica aberta para o cliente marcar.</p>
        <div className="mt-3">
          <Chips name="maxAdvanceDays" value={maxDays} onChange={setMaxDays} options={MAX_DAYS_OPTIONS.map((v) => ({ value: v, label: `${v} dias` }))} />
        </div>
      </section>

      <div className="flex gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-800">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Você está ativando:</strong> horários de {slot} em {slot} minutos. O cliente pode marcar {advText} e com até{" "}
          {maxDays} dias de antecedência.
        </p>
      </div>

      <FormMessage error={state?.error} />
      <StepFooter back="/comecar?passo=4">
        <SubmitButton className="btn-primary w-full md:w-auto md:px-8">Continuar</SubmitButton>
      </StepFooter>
    </form>
  );
}
