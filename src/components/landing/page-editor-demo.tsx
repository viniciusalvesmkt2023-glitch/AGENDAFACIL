"use client";

import "./page-editor-demo.css";
import { useEffect, useRef } from "react";

const COLORS: Record<string, [string, string]> = {
  or: ["#fe6e02", "#fea766"],
  pu: ["#8b5cf6", "#c4b5fd"],
  gr: ["#10b981", "#6ee7b7"],
  bl: ["#2563eb", "#93c5fd"],
};
const SERVICES = [
  ["✂️", "Corte masculino", "R$ 40", "linear-gradient(135deg,#3f3f46,#18181b)"],
  ["🧔", "Barba", "R$ 30", "linear-gradient(135deg,#92400e,#451a03)"],
  ["💈", "Corte + barba", "R$ 60", "linear-gradient(135deg,#1e3a8a,#0f172a)"],
  ["✨", "Sobrancelha", "R$ 15", "linear-gradient(135deg,#065f46,#022c22)"],
];

/** Liga/desliga o destaque de um item da lista ao lado (ex.: "Sua marca"). */
function highlight(listId: string, key: string) {
  document.querySelectorAll<HTMLElement>(`#${listId} > li`).forEach((li) => li.classList.toggle("live", li.dataset.k === key));
}

/**
 * Card "Um link com a cara do seu negócio": um cursor mexe no painel "Minha página"
 * (cor, capa, claro/escuro) e a página do cliente muda na hora.
 */
export function PageEditorDemo({ listId }: { listId: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
    const pp = q<HTMLDivElement>(".ed-pp");
    const cur = q<HTMLDivElement>(".ed-cursor");
    const savedEl = q<HTMLDivElement>(".ed-saved");
    const sw = (k: string) => q<HTMLElement>(`[data-c="${k}"]`);
    const capa = q<HTMLElement>(".ed-switch");
    const tCl = q<HTMLElement>("[data-t='claro']");
    const tEs = q<HTMLElement>("[data-t='escuro']");
    const editor = q<HTMLElement>(".ed-editor");
    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    const to = (target: HTMLElement) => {
      const a = target.getBoundingClientRect();
      const s = el.getBoundingClientRect();
      cur.style.transform = `translate(${a.left - s.left + a.width / 2 - 4}px, ${a.top - s.top + a.height / 2 - 2}px)`;
    };
    const click = () => {
      cur.classList.remove("click");
      void cur.offsetWidth;
      cur.classList.add("click");
    };
    const saved = () => {
      savedEl.classList.add("on");
      later(1400, () => savedEl.classList.remove("on"));
    };
    const color = (k: string, flash = true) => {
      Object.keys(COLORS).forEach((c) => sw(c).classList.toggle("on", c === k));
      pp.style.setProperty("--a", COLORS[k][0]);
      pp.style.setProperty("--a2", COLORS[k][1]);
      if (flash) saved();
    };
    const theme = (dark: boolean, flash = true) => {
      pp.classList.toggle("dark", dark);
      tEs.classList.toggle("on", dark);
      tCl.classList.toggle("on", !dark);
      if (flash) saved();
    };
    const cover = (on: boolean, flash = true) => {
      pp.classList.toggle("has-cover", on);
      capa.classList.toggle("on", on);
      if (flash) saved();
    };
    const photos = () =>
      el.querySelectorAll<HTMLElement>(".ed-svc .ed-im").forEach((im, i) =>
        later(i * 160, () => {
          im.style.transform = "scale(1.08)";
          later(260, () => (im.style.transform = ""));
        }),
      );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cover(true, false);
      return;
    }

    const play = () => {
      timers.forEach(clearTimeout);
      timers = [];
      color("or", false);
      theme(false, false);
      cover(false, false);
      savedEl.classList.remove("on");
      highlight(listId, "marca");
      cur.style.transition = "none";
      to(editor);
      void cur.offsetWidth;
      cur.style.transition = "";
      later(700, () => to(sw("pu")));
      later(1400, () => { click(); color("pu"); });
      later(2500, () => to(sw("gr")));
      later(3100, () => { click(); color("gr"); });
      later(4200, () => to(capa));
      later(4800, () => { click(); cover(true); });
      later(6100, () => to(tEs));
      later(6700, () => { click(); theme(true); });
      later(8200, () => { highlight(listId, "fotos"); photos(); });
      later(9600, () => to(sw("or")));
      later(10200, () => { click(); color("or"); highlight(listId, "marca"); });
      later(11300, () => to(tCl));
      later(11900, () => { click(); theme(false); });
      later(14500, play);
    };
    // Começa do início quando o card aparece na tela (não perde a história rolando a página)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      highlight(listId, "");
    };
  }, [listId]);

  return (
    <div className="ed" ref={root} aria-hidden="true">
      <div className="ed-phone">
        <div className="ed-scr">
          <div className="ed-pp">
            <div className="ed-cover"><span>✂</span></div>
            <div className="ed-lg"><span>B</span></div>
            <h4>Barbearia do João</h4>
            <span className="ed-open"><i /> Aberto agora · até 19h</span>
            <div className="ed-pills">
              <span className="ed-g-wa">WhatsApp</span>
              <span style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}>Instagram</span>
              <span className="ed-g-blue">Como chegar</span>
            </div>
            <div className="ed-card">
              <div className="ed-prog"><i className="on" /><i /><i /><i /></div>
              <h5>Escolha o serviço</h5>
              <div className="ed-svcs">
                {SERVICES.map(([emoji, name, price, bg], i) => (
                  <div key={name} className={`ed-svc ${i === 0 ? "sel" : ""}`}>
                    <div className="ed-im" style={{ background: bg, transition: "transform .4s" }}>{emoji}</div>
                    <div className="ed-bd"><b>{name}</b><small>{price}</small></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ed-cbar">
              <div className="ed-t"><b>Corte masculino</b><span>R$ 40 · 30 min</span></div>
              <span className="ed-go">Continuar</span>
            </div>
          </div>
        </div>
      </div>
      <div className="ed-editor">
        <div className="ed-hd">
          <span className="ed-g-purple">
            <svg className="ed-i" viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
          </span>
          Minha página
        </div>
        <div className="ed-row">
          <small>Cor</small>
          <div className="ed-sw">
            {Object.entries(COLORS).map(([k, [c]]) => (
              <i key={k} data-c={k} className={k === "or" ? "on" : ""} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="ed-row">
          <div className="ed-tg">Foto de capa <span className="ed-switch" /></div>
        </div>
        <div className="ed-row">
          <small>Aparência</small>
          <div className="ed-seg"><span data-t="claro" className="on">Claro</span><span data-t="escuro">Escuro</span></div>
        </div>
        <div className="ed-saved">
          <i className="ed-g-green"><svg className="ed-i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></i>
          Salvo · já está no seu link
        </div>
      </div>
      <div className="ed-cursor">
        <svg viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#15233e" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
}
