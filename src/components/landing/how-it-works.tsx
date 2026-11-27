"use client";

import "./how-it-works.css";
import Link from "next/link";
import { useEffect, useRef } from "react";

const I = ({ d }: { d: string }) => <svg className="hw-i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
const CLOCK = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
const ICO: Record<string, string> = { "hw-g-green": '<path d="M20 6 9 17l-5-5"/>', "hw-g-wa": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' };
const NOTES = [
  ["hw-g-green", "Lia agendou", "Corte · hoje 14:30", "agora"],
  ["hw-g-wa", "Confirmação enviada", "para Lia no WhatsApp", "agora"],
  ["hw-g-green", "Rafael agendou", "Barba · amanhã 09:00", "1 min"],
];
const SHARES = [
  ["hw-ig", '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.2"/>', "Bio do Instagram", "✓ colado"],
  ["hw-g-wa", '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', "Status", "✓ postado"],
  ["hw-g-blue", '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>', "Para clientes", "✓ enviado"],
];

/** "Como funciona": 3 passos ligados por uma linha, cada um com uma mini demonstração que acontece em sequência. */
export function HowItWorks({ trialDays }: { trialDays: number }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
    const sts = Array.from(el.querySelectorAll<HTMLElement>(".hw-st"));
    const dots = Array.from(el.querySelectorAll<HTMLElement>(".hw-rail b"));
    const fill = q<HTMLElement>(".hw-rail i");
    const ph = q<HTMLElement>(".hw-ph");
    const [fN, fP, fD] = Array.from(el.querySelectorAll<HTMLElement>(".hw-fld"));
    const sv = q<HTMLElement>(".hw-saved");
    const cp = q<HTMLElement>(".hw-copy");
    const cpTx = q<HTMLElement>("[data-copy]");
    const shs = Array.from(el.querySelectorAll<HTMLElement>(".hw-sh"));
    const inbox = q<HTMLElement>(".hw-inbox");
    const cnt = q<HTMLElement>(".hw-cnt");
    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const focus = (k: number) => {
      sts.forEach((s, i) => s.classList.toggle("on", i === k));
      dots.forEach((d, i) => d.classList.toggle("on", i <= k));
      fill.style.width = `${k * 33.33}%`;
    };
    const type = (field: HTMLElement, text: string, ms: number, done?: () => void) => {
      field.classList.add("hw-f");
      let i = 0;
      const run = () => {
        i++;
        field.innerHTML = `${text.slice(0, i)}<span class="hw-caret"></span>`;
        if (i < text.length) timers.push(setTimeout(run, ms / text.length));
        else
          later(200, () => {
            field.textContent = text;
            field.classList.remove("hw-f");
            done?.();
          });
      };
      run();
    };
    const addNote = ([c, t, s, w]: string[]) => {
      const d = document.createElement("div");
      d.className = "hw-nt";
      d.innerHTML = `<i class="${c}"><svg class="hw-i" viewBox="0 0 24 24">${ICO[c]}</svg></i><div><b>${t}</b><small>${s}</small></div><em>${w}</em>`;
      inbox.appendChild(d);
    };
    const photo = (on: boolean) => {
      ph.classList.toggle("on", on);
      ph.textContent = on ? "✂️" : "📷";
    };
    const saved = (on: boolean) => {
      sv.classList.toggle("hw-ok", on);
      sv.textContent = on ? "✓ Serviço salvo" : "Salvar serviço";
    };
    const copied = (on: boolean) => {
      cp.classList.toggle("hw-ok", on);
      cpTx.textContent = on ? "Copiado!" : "Copiar";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      focus(2);
      photo(true);
      fN.textContent = "Corte masculino";
      fP.textContent = "R$ 40";
      fD.textContent = "30 min";
      saved(true);
      copied(true);
      shs.forEach((s) => s.classList.add("on"));
      NOTES.forEach(addNote);
      cnt.textContent = "+2 hoje";
      return;
    }

    const play = () => {
      timers.forEach(clearTimeout);
      timers = [];
      [fN, fP, fD].forEach((f) => (f.textContent = ""));
      photo(false);
      saved(false);
      copied(false);
      shs.forEach((s) => s.classList.remove("on"));
      inbox.innerHTML = "";
      cnt.textContent = "+0 hoje";
      focus(0);
      later(400, () => type(fN, "Corte masculino", 900, () => type(fP, "R$ 40", 400, () => type(fD, "30 min", 400))));
      later(2700, () => photo(true));
      later(3300, () => saved(true));
      later(4200, () => focus(1));
      later(4800, () => copied(true));
      shs.forEach((s, i) => later(5500 + i * 550, () => s.classList.add("on")));
      later(7600, () => focus(2));
      NOTES.forEach((n, i) =>
        later(8100 + i * 900, () => {
          addNote(n);
          cnt.textContent = `+${i === 0 ? 1 : 2} hoje`;
        }),
      );
      later(12500, play);
    };
    // começa quando a seção aparece na tela
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="hw" ref={root}>
      <div className="hw-rail" aria-hidden="true">
        <i />
        <b>1</b>
        <b>2</b>
        <b>3</b>
      </div>
      <div className="hw-steps">
        <div className="hw-st">
          <div className="hw-hd"><span className="hw-n hw-g-brand">1</span><span className="hw-time"><I d={CLOCK} />uns 5 minutos</span></div>
          <h3>Cadastre seus serviços</h3>
          <p>Preço, duração, foto e quem faz cada um.</p>
          <div className="hw-demo" aria-hidden="true">
            <div className="hw-svcf">
              <div className="hw-ph">📷</div>
              <div>
                <div className="hw-fld" />
                <div className="hw-row2"><div className="hw-fld" /><div className="hw-fld" /></div>
              </div>
            </div>
            <div className="hw-saved">Salvar serviço</div>
          </div>
        </div>
        <div className="hw-st">
          <div className="hw-hd"><span className="hw-n hw-g-purple">2</span><span className="hw-time"><I d={CLOCK} />1 minuto</span></div>
          <h3>Compartilhe seu link</h3>
          <p>Na bio do Instagram, no status e no WhatsApp.</p>
          <div className="hw-demo" aria-hidden="true">
            <div className="hw-lnk">
              <span>horaboa.com/<em>barbearia-do-joao</em></span>
              <span className="hw-copy">
                <I d='<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' />
                <span data-copy="">Copiar</span>
              </span>
            </div>
            <div className="hw-share">
              {SHARES.map(([c, icon, t, ok]) => (
                <div key={t} className="hw-sh">
                  <i className={c}><I d={icon} /></i>
                  {t}
                  <small>{ok}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hw-st">
          <div className="hw-hd">
            <span className="hw-n hw-g-green">3</span>
            <span className="hw-time"><I d='<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>' />automático</span>
          </div>
          <h3>Receba e atenda</h3>
          <p>A agenda se organiza sozinha e o cliente recebe confirmação e lembrete.</p>
          <div className="hw-demo" aria-hidden="true">
            <span className="hw-cnt">+0 hoje</span>
            <div className="hw-inbox" />
          </div>
        </div>
      </div>
      <Link className="hw-cta" href="/cadastro">
        Começar agora <small>· {trialDays} dias grátis</small> ↗
      </Link>
    </div>
  );
}
