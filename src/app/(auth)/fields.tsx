"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

const svg = (d: React.ReactNode, cls = "au-lead") => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const ICONS = {
  mail: svg(<><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-10 6L2 7" /></>),
  lock: svg(<><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  user: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  shop: svg(<><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></>),
};

type FieldProps = { id: string; label: string; icon: keyof typeof ICONS; aside?: React.ReactNode; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>;

/** Campo com ícone na frente. */
export function Field({ id, label, icon, aside, hint, ...input }: FieldProps) {
  return (
    <div className="au-field">
      <div className="au-lab"><label htmlFor={id}>{label}</label>{aside}</div>
      <div className="au-inp">
        {ICONS[icon]}
        <input id={id} name={id} {...input} />
      </div>
      {hint && <div className="au-hint">{hint}</div>}
    </div>
  );
}

/** Campo de senha com o olho (mostrar/esconder) e aviso de Caps Lock. */
export function PasswordField({ id, label, aside, hint, ...input }: Omit<FieldProps, "icon">) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <div className="au-field">
      <div className="au-lab"><label htmlFor={id}>{label}</label>{aside}</div>
      <div className="au-inp">
        {ICONS.lock}
        <input id={id} name={id} type={show ? "text" : "password"} onKeyUp={checkCaps} onKeyDown={checkCaps} {...input} />
        <button type="button" className="au-eye" aria-label={show ? "Esconder senha" : "Mostrar senha"} aria-pressed={show} onClick={() => setShow((s) => !s)}>
          {show
            ? svg(<><path d="M3 3l18 18" /><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>, "")
            : svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>, "")}
        </button>
      </div>
      {caps && <div className="au-caps">⚠ Caps Lock está ligado</div>}
      {hint && !caps && <div className="au-hint">{hint}</div>}
    </div>
  );
}

const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

/** Botão laranja do site (brilho girando + seta). */
export function GoButton({ children, pending: pendingText }: { children: React.ReactNode; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="au-go" disabled={pending}>
      {pending ? <><span className="au-spin" />{pendingText}</> : <>{children}<span className="au-ar">{ARROW}{ARROW}</span></>}
    </button>
  );
}

export function ErrorBox({ error }: { error?: string | null }) {
  if (!error) return null;
  return <div className="au-err" role="alert">{error}</div>;
}
