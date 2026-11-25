"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-500">Acesse o painel do seu estabelecimento.</p>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Senha</label>
            <Link href="/esqueci-senha" className="mb-1 text-xs font-medium text-brand-700">Esqueci minha senha</Link>
          </div>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <FormMessage error={state?.error} />
        <SubmitButton className="btn-primary w-full" pendingText="Entrando...">Entrar</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Ainda não tem conta? <Link href="/cadastro" className="font-medium text-brand-700">Criar conta grátis</Link>
      </p>
    </>
  );
}
