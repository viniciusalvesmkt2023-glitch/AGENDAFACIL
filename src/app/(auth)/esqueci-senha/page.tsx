"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../password-actions";
import { ErrorBox, Field, GoButton } from "../fields";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <h1>Esqueceu sua senha?</h1>
      <p className="au-sub">Informe seu e-mail e enviaremos um link para criar uma nova.</p>
      {state?.success ? (
        <div className="au-ok" role="status">
          <span>✓</span>
          <div>{state.success}</div>
        </div>
      ) : (
        <form action={action}>
          <ErrorBox error={state?.error} />
          <Field id="email" label="E-mail" icon="mail" type="email" required autoComplete="email" placeholder="voce@exemplo.com" />
          <div style={{ height: 6 }} />
          <GoButton pending="Enviando...">Enviar link</GoButton>
        </form>
      )}
      <Link href="/entrar" className="au-back">← Voltar para o login</Link>
    </>
  );
}
