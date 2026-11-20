"use client";

import { useActionState, useMemo, useState } from "react";
import { createManualAppointment } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useSlots } from "@/components/use-slots";

type Props = {
  slug: string;
  initialDate: string;
  services: { id: string; name: string; label: string }[];
  professionals: { id: string; name: string; serviceIds: string[] }[];
};

export function ManualBookingForm({ slug, initialDate, services, professionals }: Props) {
  const [state, action] = useActionState(createManualAppointment, undefined);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(initialDate);
  const { slots, loading } = useSlots({ slug, serviceId, professionalId, date, painel: true });

  const availablePros = useMemo(
    () => professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId)),
    [professionals, serviceId],
  );

  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="serviceId">Serviço</label>
          <select
            className="input"
            id="serviceId"
            name="serviceId"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setProfessionalId("");
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
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="">Qualquer disponível</option>
            {availablePros.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input className="input" type="date" id="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="time">Horário</label>
          <select className="input" id="time" name="time" required disabled={!serviceId || loading}>
            <option value="">
              {!serviceId ? "Escolha o serviço" : loading ? "Carregando..." : slots.length ? "Selecione..." : "Sem horários livres"}
            </option>
            {slots.map((s) => (
              <option key={s.time} value={s.time}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="clientName">Nome do cliente</label>
          <input className="input" id="clientName" name="clientName" required />
        </div>
        <div>
          <label className="label" htmlFor="clientPhone">Telefone / WhatsApp</label>
          <input className="input" id="clientPhone" name="clientPhone" required placeholder="(11) 99999-9999" inputMode="tel" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Observações (opcional)</label>
        <textarea className="input" id="notes" name="notes" rows={2} />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="sendWhatsapp" defaultChecked className="h-4 w-4 accent-brand-600" />
        Enviar confirmação pelo WhatsApp para o cliente
      </label>
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Agendando...">Confirmar agendamento</SubmitButton>
    </form>
  );
}
