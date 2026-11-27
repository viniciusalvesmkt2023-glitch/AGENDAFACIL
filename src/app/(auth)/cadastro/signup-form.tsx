"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { ErrorBox, Field, GoButton, PasswordField } from "../fields";

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  const v = state?.values;
  return (
    <>
      <h1>Crie sua conta grátis</h1>
      <p className="au-sub">7 dias para testar tudo, sem cartão. Leva menos de 1 minuto.</p>
      <form action={action}>
        <ErrorBox error={state?.error} />
        <Field id="name" label="Seu nome" icon="user" required autoComplete="name" placeholder="Seu nome" defaultValue={v?.name} key={`n${v?.name ?? ""}`} />
        <Field id="businessName" label="Nome do estabelecimento" icon="shop" required placeholder="Ex.: Barbearia do João" defaultValue={v?.businessName} key={`b${v?.businessName ?? ""}`} />
        <Field id="email" label="E-mail" icon="mail" type="email" required autoComplete="email" placeholder="voce@exemplo.com" defaultValue={v?.email} key={`e${v?.email ?? ""}`} />
        <PasswordField id="password" label="Senha" required minLength={8} autoComplete="new-password" placeholder="Crie uma senha" hint="Pelo menos 8 caracteres." />
        <label className="au-keep">
          <input type="checkbox" name="acceptTerms" required defaultChecked={v?.acceptTerms === "on"} />
          <span>
            Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.
          </span>
        </label>
        <GoButton pending="Criando sua conta...">Criar conta grátis</GoButton>
      </form>
      <div className="au-div">Já tem conta?</div>
      <Link className="au-alt" href="/entrar">Entrar</Link>
    </>
  );
}
