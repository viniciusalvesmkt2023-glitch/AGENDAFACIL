"use client";

import "./faq.css";
import { useState } from "react";

export type FaqItem = { q: string; a: React.ReactNode; cat: "plano" | "whats" | "uso"; color: string; icon: string };

const CATS = [
  ["all", "Todas"],
  ["plano", "Teste e planos"],
  ["whats", "WhatsApp"],
  ["uso", "Como funciona"],
] as const;

const I = ({ d }: { d: string }) => <svg className="fq-i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;

/** Perguntas frequentes: ajuda ao lado, filtro por assunto e respostas que abrem uma por vez. */
export function Faq({ items, trialDays, whatsappHref, email }: { items: FaqItem[]; trialDays: number; whatsappHref: string | null; email: string }) {
  const [open, setOpen] = useState(0);
  const [cat, setCat] = useState<string>("all");

  return (
    <div className="fq">
      <div className="fq-grid">
        <div className="fq-side">
          <span className="eyebrow">Dúvidas</span>
          <h2 className="lp-disp">Perguntas <em>frequentes</em></h2>
          <p className="fq-lead">Tudo o que costumam perguntar antes de começar. Não achou a sua? Fala com a gente.</p>
          <div className="fq-help">
            <div className="fq-who">
              <span className="fq-av fq-g-brand fq-live"><I d='<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>' /></span>
              <div>
                <b>Ainda com dúvida?</b>
                <small>{whatsappHref ? "Fale com a gente pelo WhatsApp ou e-mail." : `Escreva para ${email}.`}</small>
              </div>
            </div>
            <div className="fq-acts" style={whatsappHref ? undefined : { gridTemplateColumns: "1fr" }}>
              {whatsappHref && (
                <a className="fq-g-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <I d='<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' />WhatsApp
                </a>
              )}
              <a className="fq-soft" href={`mailto:${email}`}>
                <I d='<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>' />E-mail
              </a>
            </div>
          </div>
          <div className="fq-stats">
            <div><b>{trialDays} dias</b><small>grátis</small></div>
            <div><b>5 min</b><small>pra configurar</small></div>
            <div><b>0</b><small>fidelidade</small></div>
          </div>
        </div>
        <div>
          <div className="fq-chips" role="group" aria-label="Filtrar perguntas por assunto">
            {CATS.map(([id, label]) => (
              <button key={id} type="button" className={cat === id ? "on" : ""} aria-pressed={cat === id} onClick={() => setCat(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="fq-list">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={it.q} className={`fq-q ${isOpen ? "open" : ""}`} hidden={cat !== "all" && it.cat !== cat}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                    <span className={`fq-qi ${it.color}`}><I d={it.icon} /></span>
                    <span className="fq-tx">{it.q}</span>
                    <span className="fq-pl"><I d='<path d="M12 5v14M5 12h14"/>' /></span>
                  </button>
                  <div className="fq-ans"><div><p>{it.a}</p></div></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
