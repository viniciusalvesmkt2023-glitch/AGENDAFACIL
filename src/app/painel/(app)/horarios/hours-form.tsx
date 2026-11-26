"use client";

import { useActionState, useState } from "react";
import { saveProfessionalHours, saveWorkingHours } from "@/app/painel/actions";
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

/**
 * Horários da semana. Sem `professional`: horário do estabelecimento.
 * Com `professional`: horário próprio do profissional (com a opção de seguir o do estabelecimento).
 */
export function HoursForm({ days, professional }: { days: Day[]; professional?: { id: string; name: string; customHours: boolean } }) {
  const [state, action] = useActionState(professional ? saveProfessionalHours : saveWorkingHours, undefined);
  const [open, setOpen] = useState<Record<number, boolean>>(Object.fromEntries(days.map((d) => [d.weekday, d.isOpen])));
  const [custom, setCustom] = useState(professional?.customHours ?? true);

  return (
    <form action={action} className="space-y-3">
      {professional && (
        <>
          <input type="hidden" name="professionalId" value={professional.id} />
          <div className="card flex items-center gap-3 p-4">
            <Switch name="customHours" label="Horário próprio" checked={custom} onChange={setCustom} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy-900">Horário próprio</p>
              <p className="text-sm text-zinc-500">
                {custom ? `${professional.name} atende só nos dias e horários abaixo.` : `${professional.name} segue o horário do estabelecimento.`}
              </p>
            </div>
          </div>
        </>
      )}
      <div className={custom ? "space-y-3" : "hidden"}>
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
              <p className="min-w-0 flex-1 truncate font-semibold text-navy-900">{d.label}</p>
              {!isOpen && <span className="shrink-0 text-sm text-zinc-400">Fechado</span>}
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
      </div>
      <div className="sticky bottom-[116px] z-10 space-y-2 md:bottom-4">
        <FormMessage error={state?.error} success={state?.success} />
        <SubmitButton className="btn-primary w-full shadow-lg md:w-auto">Salvar horários</SubmitButton>
      </div>
    </form>
  );
}
