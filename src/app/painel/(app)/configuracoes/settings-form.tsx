"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SlugField } from "@/components/slug-field";
import { Switch } from "@/components/switch";
import { DEADLINE_OPTIONS, deadlineLabel } from "@/lib/policy";

type Business = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  slotInterval: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
  clientCancelPolicy: string;
  cancelDeadlineMinutes: number;
  clientCanReschedule: boolean;
};

const POLICIES = [
  { id: "FREE", title: "Liberado", text: "Até a hora do horário" },
  { id: "DEADLINE", title: "Com prazo", text: "Até um tempo antes" },
  { id: "NEVER", title: "Não permitir", text: "Só falando com você" },
];

export function SettingsForm({ business }: { business: Business }) {
  const [state, action] = useActionState(saveSettings, undefined);
  const [policy, setPolicy] = useState(business.clientCancelPolicy);
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
        <p className="text-sm text-zinc-500">
          Logo, foto de capa, cor e apresentação ficam em{" "}
          <a href="/painel/pagina" className="font-semibold text-brand-700">Minha página</a>.
        </p>
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
        <div className="sm:max-w-xs">
          <label className="label" htmlFor="bufferMinutes">Intervalo entre atendimentos</label>
          <select className="input" id="bufferMinutes" name="bufferMinutes" defaultValue={business.bufferMinutes}>
            <option value={0}>Sem intervalo</option>
            {[5, 10, 15, 20, 30].map((v) => (
              <option key={v} value={v}>{v} minutos livres depois de cada cliente</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">Tempo para limpar, organizar ou descansar entre um cliente e outro.</p>
        </div>
      </section>

      <section className="card space-y-4 p-4 md:p-5">
        <div>
          <h2 className="text-lg font-bold">Cancelar e trocar horário pelo link</h2>
          <p className="text-sm text-zinc-500">Até quando o cliente pode cancelar ou trocar o horário sozinho. Você sempre pode mexer pela agenda.</p>
        </div>
        <input type="hidden" name="clientCancelPolicy" value={policy} />
        <div className="grid gap-2 sm:grid-cols-3">
          {POLICIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPolicy(p.id)}
              aria-pressed={policy === p.id}
              className={`rounded-xl border p-3 text-left transition ${policy === p.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-zinc-200 bg-white"}`}
            >
              <span className="block font-semibold text-navy-900">{p.title}</span>
              <span className="block text-sm text-zinc-500">{p.text}</span>
            </button>
          ))}
        </div>
        <div className={policy === "DEADLINE" ? "sm:max-w-xs" : "hidden"}>
          <label className="label" htmlFor="cancelDeadlineMinutes">Até quanto tempo antes</label>
          <select className="input" id="cancelDeadlineMinutes" name="cancelDeadlineMinutes" defaultValue={business.cancelDeadlineMinutes}>
            {DEADLINE_OPTIONS.map((v) => (
              <option key={v} value={v}>{deadlineLabel(v)} antes</option>
            ))}
          </select>
        </div>
        <div className={policy === "NEVER" ? "hidden" : "flex items-center gap-3 rounded-xl bg-zinc-50 p-3"}>
          <Switch name="clientCanReschedule" label="Cliente pode trocar o horário pelo link" defaultChecked={business.clientCanReschedule} />
          <div className="min-w-0">
            <p className="font-medium text-navy-900">Cliente pode trocar o horário pelo link</p>
            <p className="text-sm text-zinc-500">Mesmo serviço e mesmo profissional, só muda dia e hora.</p>
          </div>
        </div>
      </section>

      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full md:w-auto">Salvar configurações</SubmitButton>
    </form>
  );
}
