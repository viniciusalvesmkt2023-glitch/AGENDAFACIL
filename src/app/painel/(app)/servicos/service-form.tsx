"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveService } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number };

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action] = useActionState(saveService, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success && !service) formRef.current?.reset();
  }, [state, service]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">{service ? "Editar serviço" : "Novo serviço"}</h2>
      {service && <input type="hidden" name="id" value={service.id} />}
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" defaultValue={service?.name} required placeholder="Ex.: Corte masculino" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="durationMinutes">Duração (min)</label>
          <input className="input" id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} defaultValue={service?.durationMinutes ?? 30} required />
        </div>
        <div>
          <label className="label" htmlFor="price">Preço (R$)</label>
          <input
            className="input"
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={service ? (service.priceCents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="40,00"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição (opcional)</label>
        <textarea className="input" id="description" name="description" rows={2} defaultValue={service?.description ?? ""} />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full">{service ? "Salvar alterações" : "Adicionar serviço"}</SubmitButton>
    </form>
  );
}
