"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function SignupPage() {
  const [state, action] = useActionState(signup, undefined);
  return (
    <>
      <h1 className="text-xl font-semibold">Crie sua conta</h1>
      <p className="mt-1 text-sm text-zinc-500">Comece a receber agendamentos em poucos minutos.</p>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input className="input" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="businessName">Nome do estabelecimento</label>
          <input className="input" id="businessName" name="businessName" required placeholder="Ex.: Barbearia do João" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <FormMessage error={state?.error} />
        <SubmitButton className="btn-primary w-full" pendingText="Criando conta...">Criar conta</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta? <Link href="/entrar" className="font-medium text-brand-600">Entrar</Link>
      </p>
    </>
  );
}
