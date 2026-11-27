"use client";

import { useActionState } from "react";
import { saveBusinessStep } from "../actions";
import { StepFooter } from "../step-ui";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SlugField } from "@/components/slug-field";
import { AddressFields, type AddressInitial } from "@/components/address-fields";

type Props = { name: string; slug: string; slugSuggestions: string[]; phone: string; address: AddressInitial };

export function BusinessStep(b: Props) {
  const [state, action] = useActionState(saveBusinessStep, undefined);
  const v = state?.values;
  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-4 p-4 md:p-5">
        <div>
          <label className="label" htmlFor="name">Nome do estabelecimento</label>
          <input className="input" id="name" name="name" required defaultValue={v?.name ?? b.name} />
        </div>
        <div>
          <label className="label" htmlFor="slug">Link da sua agenda</label>
          <p className="mb-2 text-xs text-zinc-500">Escolha o nome do seu link. É ele que você vai mandar para os clientes e colocar no Instagram.</p>
          <SlugField defaultValue={v?.slug ?? b.slug} suggestions={b.slugSuggestions} />
        </div>
      </div>

      <div className="card space-y-4 p-4 md:p-5">
        <div>
          <label className="label" htmlFor="phone">WhatsApp do estabelecimento</label>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" placeholder="(11) 99999-9999" defaultValue={v?.phone ?? b.phone} />
          <p className="mt-1 text-xs text-zinc-500">Aparece na sua página para o cliente falar com você.</p>
        </div>
        <AddressFields initial={b.address} values={v} />
      </div>

      <FormMessage error={state?.error} />
      <StepFooter back="/comecar?passo=1">
        <SubmitButton className="btn-primary w-full md:w-auto md:px-8">Continuar</SubmitButton>
      </StepFooter>
    </form>
  );
}
