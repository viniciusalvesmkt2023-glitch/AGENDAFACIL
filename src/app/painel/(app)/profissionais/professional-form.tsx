"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveProfessional } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Professional = { id: string; name: string; phone: string | null; serviceIds: string[] };

export function ProfessionalForm({
  professional,
  services,
}: {
  professional?: Professional;
  services: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveProfessional, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success && !professional) formRef.current?.reset();
  }, [state, professional]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {professional && <input type="hidden" name="id" value={professional.id} />}
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" defaultValue={professional?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">WhatsApp (opcional)</label>
        <input className="input" id="phone" name="phone" defaultValue={professional?.phone ?? ""} placeholder="(11) 99999-9999" />
      </div>
      <fieldset>
        <legend className="label">Serviços que realiza</legend>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-500">Cadastre serviços primeiro.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={s.id}
                  defaultChecked={professional ? professional.serviceIds.includes(s.id) : true}
                  className="h-5 w-5 accent-brand-600"
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full">{professional ? "Salvar alterações" : "Adicionar profissional"}</SubmitButton>
    </form>
  );
}
