"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createManualAppointment } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useSlots } from "@/components/use-slots";

type Props = {
  slug: string;
  canSendWhatsapp: boolean;
  initialDate: string;
  /** Vindo da agenda (toque num horário vazio): já escolhe o profissional e o horário */
  initialTime?: number | null;
  initialProfessional?: string;
  services: { id: string; name: string; label: string }[];
  professionals: { id: string; name: string; serviceIds: string[] }[];
};

export function ManualBookingForm({ slug, canSendWhatsapp, initialDate, initialTime = null, initialProfessional = "", services, professionals }: Props) {
  const [state, action] = useActionState(createManualAppointment, undefined);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState(initialProfessional);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<number | null>(null);
  const { slots, loading, message } = useSlots({ slug, serviceId, professionalId, date, painel: true });
  // Horário escolhido na agenda: marca sozinho assim que os horários livres aparecem
  const [wanted, setWanted] = useState<number | null>(initialTime);
  useEffect(() => {
    if (wanted != null && time == null && slots.some((s) => s.time === wanted)) setTime(wanted);
  }, [slots, wanted, time]);

  const availablePros = useMemo(
    () => professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId)),
    [professionals, serviceId],
  );

  return (
    <form action={action} className="card max-w-2xl space-y-4 p-4 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="serviceId">Serviço</label>
          <select
            className="input"
            id="serviceId"
            name="serviceId"
            value={serviceId}
            onChange={(e) => {
              const next = e.target.value;
              setServiceId(next);
              // mantém o profissional se ele faz esse serviço
              if (!professionals.find((p) => p.id === professionalId)?.serviceIds.includes(next)) setProfessionalId("");
              setTime(null);
            }}
            required
          >
            <option value="">Selecione...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="professionalId">Profissional</label>
          <select
            className="input"
            id="professionalId"
            name="professionalId"
            value={professionalId}
            onChange={(e) => {
              setProfessionalId(e.target.value);
              setTime(null);
            }}
          >
            <option value="">Qualquer disponível</option>
            {availablePros.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input className="input" type="date" id="date" name="date" value={date} onChange={(e) => {
            setDate(e.target.value);
            setTime(null);
            setWanted(null);
          }} required />
        </div>
        <div className="sm:col-span-2">
          <p className="label">Horário</p>
          <input type="hidden" name="time" value={time ?? ""} />
          {!serviceId ? (
            <p className="rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500">Escolha o serviço para ver os horários livres.</p>
          ) : loading ? (
            <p className="rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500">Buscando horários...</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-800">{message ?? "Nenhum horário livre nesta data."}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  onClick={() => {
                    setTime(s.time);
                    setWanted(null);
                  }}
                  className={`min-h-11 rounded-xl border text-sm font-semibold transition ${
                    time === s.time ? "border-navy-900 bg-navy-900 text-white" : "border-zinc-200 bg-white text-navy-900 active:bg-zinc-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="clientName">Nome do cliente</label>
          <input className="input" id="clientName" name="clientName" required defaultValue={state?.values?.clientName} />
        </div>
        <div>
          <label className="label" htmlFor="clientPhone">Telefone / WhatsApp</label>
          <input className="input" id="clientPhone" name="clientPhone" required placeholder="(11) 99999-9999" inputMode="tel" defaultValue={state?.values?.clientPhone} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Observações (opcional)</label>
        <textarea className="input" id="notes" name="notes" rows={2} defaultValue={state?.values?.notes} />
      </div>
      {canSendWhatsapp && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="sendWhatsapp" defaultChecked className="h-5 w-5 accent-brand-600" />
          Enviar confirmação pelo WhatsApp para o cliente
        </label>
      )}
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Agendando..." className="btn-primary w-full md:w-auto">Confirmar agendamento</SubmitButton>
    </form>
  );
}
