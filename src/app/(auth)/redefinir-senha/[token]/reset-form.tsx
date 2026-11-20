"use client";

import { useActionState } from "react";
import { resetPassword } from "../../password-actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repita a nova senha</label>
        <input className="input" id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Salvando...">Salvar nova senha</SubmitButton>
    </form>
  );
}
