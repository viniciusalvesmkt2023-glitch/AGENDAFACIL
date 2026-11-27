"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { ErrorBox, Field, GoButton, PasswordField } from "../fields";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <>
      <h1>Bem-vindo de volta 👋</h1>
      <p className="au-sub">Entre no painel do seu estabelecimento.</p>
      <form action={action}>
        <ErrorBox error={state?.error} />
        <Field id="email" label="E-mail" icon="mail" type="email" required autoComplete="email" placeholder="voce@exemplo.com" defaultValue={state?.values?.email} key={`e${state?.values?.email ?? ""}`} />
        <PasswordField id="password" label="Senha" required autoComplete="current-password" placeholder="Sua senha" autoFocus={!!state?.error}
          aside={<Link href="/esqueci-senha">Esqueci minha senha</Link>} />
        <label className="au-keep">
          <input type="checkbox" name="remember" defaultChecked={state?.values ? state.values.remember === "on" : true} />
          <span>Manter conectado neste aparelho<small>Você só precisa entrar de novo se sair da conta</small></span>
        </label>
        <GoButton pending="Entrando...">Entrar</GoButton>
      </form>
      <div className="au-div">Ainda não usa o HoraBoa?</div>
      <Link className="au-alt" href="/cadastro">Criar conta grátis · 7 dias</Link>
      <div className="au-trust"><span>Sem cartão</span><span>Conexão segura</span><span>Dados protegidos (LGPD)</span></div>
    </>
  );
}
