"use client";

import "./pricing.css";
import Link from "next/link";
import { useRef, useState } from "react";

export type PricingPlan = { id: string; name: string; short: string; price: string; old: string; save: string; bill: string; day: string; off: number };

const I = ({ d }: { d: string }) => <svg className="pz-i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
const FEATURES: [string, string, string, string][] = [
  ["pz-g-brand", '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', "Agendamentos ilimitados", "Seu link aberto 24h"],
  ["pz-g-wa", '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', "WhatsApp automático", "Confirmação e lembretes"],
  ["pz-g-indigo", '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', "Profissionais ilimitados", "Cada um com seus horários"],
  ["pz-g-purple", '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>', "Página com sua marca", "Logo, capa, cores e fotos"],
  ["pz-g-teal", '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>', "Clientes e resumo", "Histórico, previsto e faltas"],
  ["pz-g-amber", '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', "Folgas e bloqueios", "Feriados e férias em 1 toque"],
];
const CHECK = '<path d="M20 6 9 17l-5-5"/>';

/** Seção de preços: seletor de plano (abre no Anual) + cartão grande com o preço e tudo que está incluso. */
export function Pricing({ plans, trialDays, initial }: { plans: PricingPlan[]; trialDays: number; initial: string }) {
  const [sel, setSel] = useState(initial);
  const priceRef = useRef<HTMLElement>(null);
  const idx = Math.max(0, plans.findIndex((p) => p.id === sel));
  const p = plans[idx];

  function pick(id: string) {
    setSel(id);
    const el = priceRef.current;
    if (el) {
      el.classList.remove("pz-flash");
      void el.offsetWidth;
      el.classList.add("pz-flash");
    }
  }

  return (
    <div className="pz">
      <div style={{ marginTop: 28 }}>
        <div className="pz-seg" role="radiogroup" aria-label="Escolha o plano">
          <span className="pz-ind" style={{ transform: `translateX(${idx * 100}%)`, width: `calc((100% - 10px) / ${plans.length})` }} />
          {plans.map((pl) => (
            <button key={pl.id} type="button" role="radio" aria-checked={pl.id === sel} className={pl.id === sel ? "on" : ""} onClick={() => pick(pl.id)}>
              {pl.short} {pl.off > 0 && <small>−{pl.off}%</small>}
            </button>
          ))}
        </div>
      </div>

      <div className="pz-big">
        <div className="pz-l">
          <div className="pz-plan">
            <span>{p.name}</span>
            {p.save && <span className="pz-save">{p.save}</span>}
          </div>
          <div className="pz-old">{p.old}</div>
          <div className="pz-price">
            <span className="pz-cur">R$</span>
            <b ref={priceRef}>{p.price}</b>
            <span className="pz-per">/mês</span>
          </div>
          <div className="pz-bill">{p.bill}</div>
          <div className="pz-perks3">
            <div className="pz-pk">
              <span className="pz-pki pz-g-green"><I d='<path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>' /></span>
              <div><b>{p.day}</b><small>menos que um cafezinho</small></div>
            </div>
            <div className="pz-pk">
              <span className="pz-pki pz-g-brand"><I d='<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>' /></span>
              <div><b>{trialDays} dias grátis</b><small>teste tudo antes</small></div>
            </div>
            <div className="pz-pk">
              <span className="pz-pki pz-g-blue"><I d='<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M3 3l18 18"/>' /></span>
              <div><b>Sem cartão</b><small>para começar o teste</small></div>
            </div>
          </div>
          <Link href="/cadastro" className="pz-shine">Começar meus {trialDays} dias grátis ↗</Link>
          <p className="pz-small">Sem fidelidade · cancele quando quiser</p>
        </div>
        <div className="pz-r">
          <div className="pz-rh"><h4>Tudo incluso em qualquer plano</h4><span className="pz-cnt">{FEATURES.length} recursos</span></div>
          <div className="pz-fgrid">
            {FEATURES.map(([color, icon, title, sub], i) => (
              <div key={title} className="pz-ftile" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className={`pz-fic ${color}`}><I d={icon} /></span>
                <b>{title}</b>
                <small>{sub}</small>
                <span className="pz-ok"><I d={CHECK} /></span>
              </div>
            ))}
          </div>
          <div className="pz-extra">
            <span className="pz-g-brand"><I d='<path d="M12 3v18M3 12h18"/>' /></span>Sem taxa por agendamento e sem limite de clientes
          </div>
        </div>
      </div>

      <div className="pz-perks">
        <span><I d='<path d="m12 2 4.5 4.5L12 11 7.5 6.5zM12 13l4.5 4.5L12 22l-4.5-4.5zM2 12l4.5-4.5L11 12l-4.5 4.5zM13 12l4.5-4.5L22 12l-4.5 4.5z"/>' />Pix com renovação automática</span>
        <span><I d='<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>' />Cartão de crédito</span>
        <span><I d='<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>' />Pagamento seguro</span>
      </div>
    </div>
  );
}
