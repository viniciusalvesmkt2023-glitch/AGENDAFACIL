"use client";

import { useActionState, useState } from "react";
import { saveWorkingHours } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Switch } from "@/components/switch";

type Day = {
  weekday: number;
  label: string;
  isOpen: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

export function HoursForm({ days }: { days: Day[] }) {
  const [state, action] = useActionState(saveWorkingHours, undefined);
  const [open, setOpen] = useState<Record<number, boolean>>(Object.fromEntries(days.map((d) => [d.weekday, d.isOpen])));

  return (
    <form action={action} className="space-y-3">
      {days.map((d) => {
        const isOpen = open[d.weekday];
        return (
          <div key={d.weekday} className="card p-4">
            <div className="flex items-center gap-3">
              <Switch
                name={`open_${d.weekday}`}
                label={`${d.label} aberto`}
                checked={isOpen}
                onChange={(v) => setOpen((o) => ({ ...o, [d.weekday]: v }))}
              />
              <p className="flex-1 font-semibold text-navy-900">{d.label}</p>
              {!isOpen && <span className="text-sm text-zinc-400">Fechado</span>}
            </div>
            {/* Campos sempre enviados (ficam escondidos quando o dia está fechado) */}
            <div className={isOpen ? "mt-3 space-y-3" : "hidden"}>
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="label">Abre</span>
                  <input type="time" name={`start_${d.weekday}`} defaultValue={d.start} className="input" />
                </label>
                <label className="min-w-0">
                  <span className="label">Fecha</span>
                  <input type="time" name={`end_${d.weekday}`} defaultValue={d.end} className="input" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="label">Intervalo de</span>
                  <input type="time" name={`breakStart_${d.weekday}`} defaultValue={d.breakStart} className="input" />
                </label>
                <label className="min-w-0">
                  <span className="label">até</span>
                  <input type="time" name={`breakEnd_${d.weekday}`} defaultValue={d.breakEnd} className="input" />
                </label>
              </div>
            </div>
          </div>
        );
      })}
      <div className="sticky bottom-24 z-10 space-y-2 md:bottom-4">
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton className="btn-primary w-full shadow-lg md:w-auto">Salvar horários</SubmitButton>
      </div>
    </form>
  );
}
