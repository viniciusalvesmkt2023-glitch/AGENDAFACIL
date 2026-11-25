"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../password-actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Esqueceu sua senha?</h1>
      <p className="mt-1 text-sm text-zinc-500">Informe seu e-mail e enviaremos um link para criar uma nova.</p>
      {state?.success ? (
        <div className="mt-6"><FormMessage success={state.success} /></div>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <FormMessage error={state?.error} />
          <SubmitButton className="btn-primary w-full" pendingText="Enviando...">Enviar link</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/entrar" className="font-medium text-brand-700">Voltar para o login</Link>
      </p>
    </>
  );
}
