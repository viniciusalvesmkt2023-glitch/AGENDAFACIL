"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { BusinessTypeIcon } from "@/components/business-type-icon";
import { BUSINESS_TYPE_LIST } from "@/lib/business-types";

export default function SignupPage() {
  const [state, action] = useActionState(signup, undefined);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Crie sua conta</h1>
      <p className="mt-1 text-sm text-zinc-500">Comece a receber agendamentos em poucos minutos.</p>
      <form action={action} className="mt-6 space-y-4">
        <fieldset>
          <legend className="label">Qual é o seu tipo de negócio?</legend>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPE_LIST.map((t) => (
              <label
                key={t.id}
                className={`relative flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-navy-900 transition has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-100 ${
                  t.id === "OUTRO" ? "col-span-2" : ""
                }`}
              >
                <input
                  type="radio"
                  name="businessType"
                  value={t.id}
                  required
                  defaultChecked={state?.values?.businessType === t.id}
                  className="peer sr-only"
                />
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700 peer-checked:bg-brand-500 peer-checked:text-white">
                  <BusinessTypeIcon type={t.id} className="h-4 w-4" />
                </span>
                <span className="leading-tight">{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input className="input" id="name" name="name" required autoComplete="name" defaultValue={state?.values?.name} />
        </div>
        <div>
          <label className="label" htmlFor="businessName">Nome do estabelecimento</label>
          <input className="input" id="businessName" name="businessName" required placeholder="Ex.: Barbearia do João" defaultValue={state?.values?.businessName} />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-2 text-sm text-zinc-600">
          <input type="checkbox" name="acceptTerms" required defaultChecked={state?.values?.acceptTerms === "on"} className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="text-brand-700 underline">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" target="_blank" className="text-brand-700 underline">Política de Privacidade</Link>.
          </span>
        </label>
        <FormMessage error={state?.error} />
        <SubmitButton className="btn-primary w-full" pendingText="Criando conta...">Criar conta</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta? <Link href="/entrar" className="font-medium text-brand-700">Entrar</Link>
      </p>
    </>
  );
}
