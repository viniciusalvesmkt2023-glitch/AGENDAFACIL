"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SlugField } from "@/components/slug-field";

type Business = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  slotInterval: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
};

export function SettingsForm({ business }: { business: Business }) {
  const [state, action] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="text-lg font-bold">Dados do estabelecimento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input className="input" id="name" name="name" defaultValue={business.name} required />
          </div>
          <div>
            <label className="label" htmlFor="slug">Endereço da página</label>
            <SlugField defaultValue={business.slug} />
          </div>
          <div>
            <label className="label" htmlFor="phone">WhatsApp</label>
            <input className="input" id="phone" name="phone" defaultValue={business.phone ?? ""} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="label" htmlFor="address">Endereço</label>
            <input className="input" id="address" name="address" defaultValue={business.address ?? ""} placeholder="Rua, número - bairro, cidade" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Descrição (aparece na página de agendamento)</label>
          <textarea className="input" id="description" name="description" rows={2} defaultValue={business.description ?? ""} />
        </div>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="text-lg font-bold">Regras de agendamento online</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="slotInterval">Intervalo entre horários</label>
            <select className="input" id="slotInterval" name="slotInterval" defaultValue={business.slotInterval}>
              {[10, 15, 20, 30, 45, 60].map((v) => (
                <option key={v} value={v}>{v} minutos</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="minAdvanceMinutes">Antecedência mínima</label>
            <select className="input" id="minAdvanceMinutes" name="minAdvanceMinutes" defaultValue={business.minAdvanceMinutes}>
              <option value={0}>Sem antecedência</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={240}>4 horas</option>
              <option value={720}>12 horas</option>
              <option value={1440}>1 dia</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="maxAdvanceDays">Agendar com até</label>
            <select className="input" id="maxAdvanceDays" name="maxAdvanceDays" defaultValue={business.maxAdvanceDays}>
              {[7, 14, 30, 60, 90].map((v) => (
                <option key={v} value={v}>{v} dias de antecedência</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full md:w-auto">Salvar configurações</SubmitButton>
    </form>
  );
}
