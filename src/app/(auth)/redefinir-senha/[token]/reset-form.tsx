"use client";

import { useActionState } from "react";
import { resetPassword } from "../../password-actions";
import { ErrorBox, GoButton, PasswordField } from "../../fields";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <ErrorBox error={state?.error} />
      <PasswordField id="password" label="Nova senha" required minLength={8} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" />
      <PasswordField id="confirm" label="Repita a nova senha" required minLength={8} autoComplete="new-password" placeholder="Digite de novo" />
      <p className="au-hint" style={{ margin: "0 0 16px" }}>Por segurança, os outros aparelhos conectados serão desconectados.</p>
      <GoButton pending="Salvando...">Salvar nova senha</GoButton>
    </form>
  );
}
