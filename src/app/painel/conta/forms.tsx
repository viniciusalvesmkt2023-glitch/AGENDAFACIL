"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword, deleteAccount, updateProfile } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [newEmail, setNewEmail] = useState(email);
  const changing = newEmail.trim().toLowerCase() !== email.toLowerCase();
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input className="input" id="name" name="name" defaultValue={name} required autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail de acesso</label>
        <input className="input" id="email" name="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required autoComplete="email" />
      </div>
      {changing && (
        <div>
          <label className="label" htmlFor="profileCurrent">Senha atual (para trocar o e-mail)</label>
          <input className="input" id="profileCurrent" name="current" type="password" required autoComplete="current-password" />
        </div>
      )}
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full md:w-auto">Salvar dados</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="current">Senha atual</label>
        <input className="input" id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Repita a nova senha</label>
          <input className="input" id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-secondary w-full md:w-auto">Alterar senha</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ businessName }: { businessName: string }) {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Isso apaga <strong>para sempre</strong> a conta de <strong>{businessName}</strong>: serviços, equipe, clientes, agendamentos e
        histórico. Sua assinatura é cancelada e o link de agendamento para de funcionar. Não dá para desfazer.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="del-password">Sua senha</label>
          <input className="input" id="del-password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <div>
          <label className="label" htmlFor="del-confirm">Digite EXCLUIR</label>
          <input className="input" id="del-confirm" name="confirm" required autoComplete="off" autoCapitalize="characters" />
        </div>
      </div>
      <FormMessage error={state?.error} />
      <SubmitButton className="btn-danger w-full md:w-auto" pendingText="Excluindo...">Excluir minha conta</SubmitButton>
    </form>
  );
}
