"use client";

import "./final-cta.css";
import Link from "next/link";
import { useEffect, useRef } from "react";

const I = ({ d }: { d: string }) => <svg className="cf-i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
const CHECK = '<path d="M20 6 9 17l-5-5"/>';
const NOTES: [string, string, string, string][] = [
  ["cf-n1", "cf-g-green", CHECK, "Novo agendamento|Lia · hoje às 14:30"],
  ["cf-n2", "cf-g-wa", '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', "Lembrete enviado|Rafael · amanhã 09:00"],
  ["cf-n3", "cf-g-blue", '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', "Horário trocado|Bruno · sex 16:00"],
  ["cf-n4", "cf-g-brand", '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', "Previsto hoje|R$ 460 em 9 horários"],
];
const STEPS = [
  ["Crie sua conta", "2 minutos"],
  ["Cadastre os serviços", "preço, duração e foto"],
  ["Compartilhe o link", "e receba agendamentos"],
];

/** Chamada final (passos acendendo, notificações chegando, botão com brilho) e o rodapé. */
export function FinalCta({ trialDays, year }: { trialDays: number; year: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const steps = Array.from(el.querySelectorAll<HTMLElement>(".cf-st"));
    const notes = Array.from(el.querySelectorAll<HTMLElement>(".cf-note"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      steps.forEach((s) => s.classList.add("cf-on"));
      notes.forEach((n) => n.classList.add("cf-show"));
      return;
    }
    let k = 0;
    const t1 = setInterval(() => {
      k = (k + 1) % steps.length;
      steps.forEach((s, i) => s.classList.toggle("cf-on", i === k));
    }, 1800);
    let j = 0;
    const tick = () => {
      notes.forEach((n) => n.classList.remove("cf-show"));
      notes[j % 4].classList.add("cf-show");
      notes[(j + 2) % 4].classList.add("cf-show");
      j++;
    };
    tick();
    const t2 = setInterval(tick, 2600);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  return (
    <div className="cf" ref={root}>
      <section className="cf-box">
        <span className="cf-glow" aria-hidden="true" />
        {NOTES.map(([pos, color, icon, text]) => {
          const [t, s] = text.split("|");
          return (
            <div key={pos} className={`cf-note ${pos}`} aria-hidden="true">
              <span className={`cf-ic ${color}`}><I d={icon} /></span>
              <div>{t}<small>{s}</small></div>
            </div>
          );
        })}
        <div className="cf-mark" aria-hidden="true">
          <span><I d='<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>' /></span>
        </div>
        <h2>Pronto para encher <em>sua agenda?</em></h2>
        <p className="cf-sub">Crie sua conta em 2 minutos e comece a receber agendamentos hoje mesmo.</p>
        <div className="cf-steps">
          {STEPS.map(([t, s], i) => (
            <div key={t} style={{ display: "contents" }}>
              {i > 0 && <span className="cf-arrow" aria-hidden="true">→</span>}
              <div className={`cf-st ${i === 0 ? "cf-on" : ""}`}>
                <span className="cf-n">{i + 1}</span>
                <div><b>{t}</b><small>{s}</small></div>
              </div>
            </div>
          ))}
        </div>
        <Link className="cf-shine" href="/cadastro">Testar grátis por {trialDays} dias ↗</Link>
        <div className="cf-trust">
          {["Sem cartão", "Sem fidelidade", "Cancele quando quiser"].map((t) => (
            <span key={t}><I d={CHECK} />{t}</span>
          ))}
        </div>
      </section>

      <footer className="cf-foot">
        <div className="cf-fl">
          <span className="cf-lg cf-g-brand"><I d='<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' /></span>
          <div>
            <b>Hora<span>Boa</span></b>
            <small>Agendamento online com lembretes no WhatsApp</small>
          </div>
        </div>
        <nav className="cf-links" aria-label="Rodapé">
          <a href="#como">Como funciona</a>
          <a href="#precos">Preços</a>
          <Link href="/entrar">Entrar</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <span>© {year} HoraBoa</span>
        </nav>
      </footer>
    </div>
  );
}
