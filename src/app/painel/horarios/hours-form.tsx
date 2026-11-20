"use client";

import { useActionState } from "react";
import { saveWorkingHours } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

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
  return (
    <form action={action} className="card p-5">
      <div className="divide-y divide-zinc-100">
        {days.map((d) => (
          <div key={d.weekday} className="grid gap-3 py-4 sm:grid-cols-[150px_1fr_1fr] sm:items-center">
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" name={`open_${d.weekday}`} defaultChecked={d.isOpen} className="h-4 w-4 accent-brand-600" />
              {d.label}
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 text-zinc-500">Abre</span>
              <input type="time" name={`start_${d.weekday}`} defaultValue={d.start} className="input" />
              <span className="text-zinc-400">às</span>
              <input type="time" name={`end_${d.weekday}`} defaultValue={d.end} className="input" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 text-zinc-500">Intervalo</span>
              <input type="time" name={`breakStart_${d.weekday}`} defaultValue={d.breakStart} className="input" />
              <span className="text-zinc-400">às</span>
              <input type="time" name={`breakEnd_${d.weekday}`} defaultValue={d.breakEnd} className="input" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton>Salvar horários</SubmitButton>
      </div>
    </form>
  );
}
