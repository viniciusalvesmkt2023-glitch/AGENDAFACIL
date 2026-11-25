"use client";

import { useActionState, useState } from "react";
import { saveBusinessStep } from "../actions";
import { StepFooter } from "../step-ui";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SlugField } from "@/components/slug-field";
import { BUSINESS_TYPE_LIST } from "@/lib/business-types";

type Props = { name: string; businessType: string; slug: string; phone: string; address: string; homeService: boolean };

export function BusinessStep(b: Props) {
  const [state, action] = useActionState(saveBusinessStep, undefined);
  const v = state?.values;
  const [home, setHome] = useState(v ? v.homeService === "on" : b.homeService);
  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-4 p-4 md:p-5">
        <div>
          <label className="label" htmlFor="name">Nome do estabelecimento</label>
          <input className="input" id="name" name="name" required defaultValue={v?.name ?? b.name} />
        </div>
        <div>
          <label className="label" htmlFor="businessType">Tipo de negócio</label>
          <select className="input" id="businessType" name="businessType" defaultValue={v?.businessType ?? b.businessType}>
            {BUSINESS_TYPE_LIST.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="slug">Link da sua agenda</label>
          <SlugField defaultValue={v?.slug ?? b.slug} />
          <p className="mt-1 text-xs text-zinc-500">É esse link que você vai mandar para os clientes e colocar no Instagram.</p>
        </div>
      </div>

      <div className="card space-y-4 p-4 md:p-5">
        <div>
          <label className="label" htmlFor="phone">WhatsApp do estabelecimento</label>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" placeholder="(11) 99999-9999" defaultValue={v?.phone ?? b.phone} />
          <p className="mt-1 text-xs text-zinc-500">Aparece na sua página para o cliente falar com você.</p>
        </div>
        <div>
          <label className="label" htmlFor="address">Endereço</label>
          <input
            className="input disabled:bg-zinc-50 disabled:text-zinc-400"
            id="address"
            name="address"
            placeholder="Rua, número - bairro, cidade"
            defaultValue={v?.address ?? b.address}
            disabled={home}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="homeService" checked={home} onChange={(e) => setHome(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Atendo sem endereço fixo (a domicílio)
          </label>
        </div>
      </div>

      <FormMessage error={state?.error} />
      <StepFooter>
        <SubmitButton className="btn-primary w-full md:w-auto md:px-8">Continuar</SubmitButton>
      </StepFooter>
    </form>
  );
}
