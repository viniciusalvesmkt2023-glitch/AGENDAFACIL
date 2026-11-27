"use client";

import "./hero-demo.css";
import { useEffect, useRef } from "react";

const TITLES = ["Escolha o serviço", "Com quem você quer ser atendido?", "Escolha o dia e o horário", "Seus dados", ""];
const SERVICES = [
  ["✂", "Corte masculino", "R$ 40", "linear-gradient(135deg,#3f3f46,#18181b)"],
  ["B", "Barba", "R$ 30", "linear-gradient(135deg,#92400e,#451a03)"],
  ["C", "Corte + barba", "R$ 60", "linear-gradient(135deg,#1e3a8a,#0f172a)"],
  ["S", "Sobrancelha", "R$ 15", "linear-gradient(135deg,#065f46,#022c22)"],
];
const SLOTS = ["13:30", "14:00", "14:30", "15:00", "15:30", "16:30"];

const Check = () => (
  <svg className="hd-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const Whats = () => (
  <svg className="hd-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
);

/**
 * Topo da página de vendas: o cliente agenda pelo link (serviço → profissional → horário → dados)
 * e o agendamento chega no painel do barbeiro. Repete em loop; quem prefere menos movimento vê o resultado parado.
 */
export function HeroDemo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
    const stage = q<HTMLDivElement>(".hd-stage");
    const cli = q<HTMLDivElement>(".hd-cli");
    const tap = q<HTMLDivElement>(".hd-tap");
    const cbar = q<HTMLDivElement>(".hd-cbar");
    const views = Array.from(el.querySelectorAll<HTMLElement>(".hd-view"));
    const svcs = Array.from(el.querySelectorAll<HTMLElement>(".hd-svc"));
    const pro = q<HTMLElement>("[data-pro]");
    const slot = q<HTMLElement>("[data-slot]");
    const go = q<HTMLElement>(".hd-go");
    const confirm = q<HTMLElement>(".hd-confirm");
    const fName = q<HTMLElement>("[data-name]");
    const fPhone = q<HTMLElement>("[data-phone]");
    const next = q<HTMLElement>(".hd-bw-new");
    const dot = q<HTMLElement>(".hd-beam-dot");
    const beam = q<HTMLElement>(".hd-beam");
    const sN = q<HTMLElement>("[data-n]");
    const sV = q<HTMLElement>("[data-v]");
    const f1 = q<HTMLElement>(".hd-f1");
    const f2 = q<HTMLElement>(".hd-f2");
    const prog = Array.from(el.querySelectorAll<HTMLElement>(".hd-prog i"));
    const eyebrow = q<HTMLElement>(".hd-eyebrow");
    const title = q<HTMLElement>(".hd-mcard h5");
    const cbT = q<HTMLElement>("[data-cbt]");
    const cbS = q<HTMLElement>("[data-cbs]");

    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    // posição do "dedo" relativa à tela do celular (sem contar rotação/escala)
    const move = (target: HTMLElement) => {
      let x = 0;
      let y = 0;
      let n: HTMLElement | null = target;
      while (n && n !== cli) {
        x += n.offsetLeft;
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      tap.style.left = `${x + target.offsetWidth / 2 - 13}px`;
      tap.style.top = `${y + target.offsetHeight / 2 - 13}px`;
    };
    const press = () => {
      tap.classList.remove("press");
      void tap.offsetWidth;
      tap.classList.add("press");
    };
    const step = (n: number) => {
      views.forEach((v) => {
        const k = Number(v.dataset.view);
        v.classList.toggle("on", k === n);
        v.classList.toggle("past", k < n);
      });
      prog.forEach((b, i) => b.classList.toggle("on", i < Math.min(n, 4)));
      eyebrow.textContent = n <= 4 ? `Etapa ${n} de 4` : "Pronto";
      title.textContent = TITLES[n - 1];
      title.style.display = n === 5 ? "none" : "";
    };
    const bar = (t: string, s: string) => {
      cbT.textContent = t;
      cbS.textContent = s;
      cbar.classList.remove("hide");
    };
    const type = (field: HTMLElement, text: string, ms: number) => {
      field.classList.add("focus");
      let i = 0;
      const run = () => {
        i++;
        field.innerHTML = `${text.slice(0, i)}<span class="hd-caret"></span>`;
        if (i < text.length) timers.push(setTimeout(run, ms / text.length));
        else
          later(250, () => {
            field.textContent = text;
            field.classList.remove("focus");
          });
      };
      run();
    };
    const count = (target: HTMLElement, from: number, to: number, fmt: (v: number) => string) => {
      const t0 = performance.now();
      target.classList.add("bump");
      const f = (t: number) => {
        const p = Math.min(1, (t - t0) / 700);
        target.textContent = fmt(Math.round(from + (to - from) * p));
        if (p < 1) requestAnimationFrame(f);
        else later(600, () => target.classList.remove("bump"));
      };
      requestAnimationFrame(f);
    };
    // Estado final (para quem prefere menos movimento)
    const finalState = () => {
      step(5);
      next.classList.remove("hide");
      sN.textContent = "9";
      sV.textContent = "R$ 460";
      f1.classList.add("show");
      f2.classList.add("show");
    };

    const play = () => {
      timers.forEach(clearTimeout);
      timers = [];
      el.querySelectorAll(".sel").forEach((e) => e.classList.remove("sel"));
      slot.classList.remove("pick");
      fName.textContent = "";
      fPhone.textContent = "";
      cbar.classList.add("hide");
      next.classList.add("hide");
      next.classList.remove("glow");
      f1.classList.remove("show");
      f2.classList.remove("show");
      sN.textContent = "8";
      sV.textContent = "R$ 420";
      step(1);
      tap.classList.remove("on");
      tap.style.transition = "none";
      move(svcs[3]);
      void tap.offsetWidth;
      tap.style.transition = "";
      // 1. serviço
      later(500, () => {
        tap.classList.add("on");
        move(svcs[0]);
      });
      later(1150, () => {
        press();
        svcs[0].classList.add("sel");
        bar("Corte masculino", "R$ 40 · 30 min");
      });
      later(1700, () => move(go));
      later(2250, () => {
        press();
        step(2);
      });
      // 2. profissional
      later(2800, () => move(pro));
      later(3400, () => {
        press();
        pro.classList.add("sel");
        bar("João", "Corte masculino");
      });
      later(3950, () => move(go));
      later(4500, () => {
        press();
        step(3);
      });
      // 3. horário
      later(5050, () => move(slot));
      later(5650, () => {
        press();
        slot.classList.add("pick");
        bar("Hoje · 14:30", "Corte masculino · João");
      });
      later(6200, () => move(go));
      later(6750, () => {
        press();
        step(4);
        cbar.classList.add("hide");
        tap.classList.remove("on");
      });
      // 4. dados
      later(7100, () => type(fName, "Lia Souza", 700));
      later(8000, () => type(fPhone, "(85) 98888-1234", 800));
      later(9000, () => {
        tap.classList.add("on");
        move(confirm);
      });
      later(9600, press);
      // 5. confirmado e chega no painel do barbeiro
      later(9900, () => {
        step(5);
        tap.classList.remove("on");
      });
      later(10500, () => {
        // o agendamento "voa" do celular até o painel
        beam.classList.add("on");
        dot.classList.remove("go");
        void dot.offsetWidth;
        dot.classList.add("go");
        later(1200, () => beam.classList.remove("on"));
        f1.classList.add("show");
        next.classList.remove("hide");
        next.classList.add("glow");
        count(sN, 8, 9, (v) => String(v));
        count(sV, 420, 460, (v) => `R$ ${v}`);
      });
      later(12000, () => next.classList.remove("glow"));
      later(12300, () => f2.classList.add("show"));
      later(15200, () => {
        f1.classList.remove("show");
        f2.classList.remove("show");
      });
      later(16000, play);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finalState();
      return;
    }
    play();

    // inclinação bem leve seguindo o mouse (só no computador)
    const onMove = (e: MouseEvent) => {
      if (!window.matchMedia("(pointer: fine)").matches || window.innerWidth < 700) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.transform = `perspective(1600px) rotateY(${(x * 4).toFixed(2)}deg) rotateX(${(-y * 3).toFixed(2)}deg)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="hd" ref={root} aria-hidden="true">
      <div className="hd-stage">
        {/* Cliente agendando pelo link */}
        <div className="hd-phone hd-ph-a">
          <div className="hd-scr">
            <div className="hd-cli">
              <div className="hd-sbar"><span>9:41</span><span className="hd-cam" /><span className="hd-sig"><i /><i /><i /><i /></span></div>
              <div className="hd-cli-head">
                <div className="hd-lg"><span>B</span></div>
                <div>
                  <b>Barbearia do João</b>
                  <small><i /> Aberto agora · até 19h</small>
                </div>
              </div>
              <div className="hd-mcard">
                <div className="hd-prog"><i className="on" /><i /><i /><i /></div>
                <span className="hd-eyebrow">Etapa 1 de 4</span>
                <h5>Escolha o serviço</h5>
                <div className="hd-views">
                  <div className="hd-view on" data-view="1">
                    <div className="hd-svcs">
                      {SERVICES.map(([mark, name, price, bg]) => (
                        <div key={name} className="hd-svc">
                          <div className="hd-im" style={{ background: bg }}>{mark}</div>
                          <div className="hd-bd"><b>{name}</b><small>{price}</small></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hd-view" data-view="2">
                    <div className="hd-pros">
                      <div className="hd-pro">
                        <span className="hd-av" style={{ background: "linear-gradient(135deg,#a1a1aa,#52525b)" }}>✱</span>
                        <div><b>Sem preferência</b><small>Primeiro disponível</small></div>
                      </div>
                      <div className="hd-pro" data-pro="">
                        <span className="hd-av hd-g-brand">J</span>
                        <div><b>João</b><small>Cortes e barba</small></div>
                      </div>
                      <div className="hd-pro">
                        <span className="hd-av hd-g-blue">P</span>
                        <div><b>Pedro</b><small>Barba e sobrancelha</small></div>
                      </div>
                    </div>
                  </div>
                  <div className="hd-view" data-view="3">
                    <div className="hd-days">
                      <span className="hd-day hd-hoje">HOJE<b>26</b></span>
                      <span className="hd-day">SEX<b>27</b></span>
                      <span className="hd-day">SÁB<b>28</b></span>
                      <span className="hd-day off">DOM<b>29</b></span>
                    </div>
                    <div className="hd-pbox">
                      <b><span>☀️</span>Tarde</b>
                      <div className="hd-slots">
                        {SLOTS.map((s) => (
                          <span key={s} className="hd-slot" data-slot={s === "14:30" ? "" : undefined}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="hd-view" data-view="4">
                    <div className="hd-fld"><span>Seu nome</span><div data-name="" /></div>
                    <div className="hd-fld"><span>WhatsApp</span><div data-phone="" /></div>
                    <div className="hd-sum">
                      <div><span>Serviço</span><b>Corte masculino</b></div>
                      <div><span>Profissional</span><b>João</b></div>
                      <div><span>Quando</span><b>Hoje às 14:30</b></div>
                      <div><span>Valor</span><b>R$ 40</b></div>
                    </div>
                    <div className="hd-confirm hd-g-brand">Confirmar agendamento</div>
                  </div>
                  <div className="hd-view" data-view="5">
                    <div className="hd-done">
                      <span className="hd-ok hd-g-green"><Check /></span>
                      <b>Agendamento confirmado!</b>
                      <small>Hoje às 14:30 com João. A confirmação chegou no seu WhatsApp.</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hd-cbar hide">
                <div className="hd-t"><b data-cbt="">Corte masculino</b><span data-cbs="">R$ 40 · 30 min</span></div>
                <span className="hd-go hd-g-brand">Continuar</span>
              </div>
              <div className="hd-tap" />
            </div>
          </div>
        </div>

        {/* Painel no computador recebendo */}
        <div className="hd-bw">
          <div className="hd-bw-bar">
            <span className="hd-dots"><i /><i /><i /></span>
            <span className="hd-url">
              <svg className="hd-i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              horaboa.com/painel
            </span>
          </div>
          <div className="hd-bw-body">
            <aside className="hd-bw-side">
              <span className="hd-bw-logo">B</span>
              <span className="on"><svg className="hd-i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' }} /></span>
              <span className=""><svg className="hd-i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' }} /></span>
              <span className=""><svg className="hd-i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>' }} /></span>
              <span className=""><svg className="hd-i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' }} /></span>
              <span className=""><svg className="hd-i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' }} /></span>
            </aside>
            <div className="hd-bw-main">
              <div className="hd-bw-hd">
                <div><small>Boa tarde, João 👋</small><b>Agenda de hoje</b></div>
                <span className="hd-bw-live"><i />ao vivo</span>
                <span className="hd-bw-new-btn">+ Novo</span>
              </div>
              <div className="hd-bw-stats">
                <div><span className="hd-dot hd-g-green" /><small>Agendados</small><b data-n="">8</b></div>
                <div><span className="hd-dot hd-g-blue" /><small>Previsto</small><b data-v="">R$ 420</b></div>
                <div><span className="hd-dot hd-g-amber" /><small>Faltas</small><b>0</b></div>
              </div>
              <div className="hd-bw-list">
                <div className="hd-bw-row hd-bw-new hide"><span className="hd-bw-tm">14:30</span><span className="hd-bw-av hd-lia">L</span><div className="hd-bw-t"><b>Lia Souza</b><small>Corte masculino · João</small></div><span className="hd-bw-tag">Novo</span></div>
                <div className="hd-bw-row"><span className="hd-bw-tm">15:00</span><span className="hd-bw-av hd-g-blue">R</span><div className="hd-bw-t"><b>Rafael</b><small>Barba · Pedro</small></div><span className="hd-bw-ok">Confirmado</span></div>
                <div className="hd-bw-row"><span className="hd-bw-tm">16:00</span><span className="hd-bw-av hd-g-purple">B</span><div className="hd-bw-t"><b>Bruno</b><small>Corte + barba · João</small></div><span className="hd-bw-ok">Confirmado</span></div>
                <div className="hd-bw-row"><span className="hd-bw-tm">17:00</span><span className="hd-bw-av hd-g-green">D</span><div className="hd-bw-t"><b>Diego</b><small>Corte · João</small></div><span className="hd-bw-ok">Confirmado</span></div>
              </div>
            </div>
          </div>
        </div>
        <svg className="hd-beam" viewBox="0 0 920 640" preserveAspectRatio="none"><path d="M300 400 C 410 430, 400 250, 500 248" /></svg>
        <span className="hd-beam-dot" />

        <div className="hd-float hd-f1">
          <span className="hd-ic hd-g-green"><Check /></span>
          <div>Novo agendamento<small>Lia · hoje às 14:30</small></div>
        </div>
        <div className="hd-float hd-f2">
          <span className="hd-ic hd-g-wa"><Whats /></span>
          <div>Confirmação enviada<small>pelo seu WhatsApp</small></div>
        </div>
      </div>
    </div>
  );
}
