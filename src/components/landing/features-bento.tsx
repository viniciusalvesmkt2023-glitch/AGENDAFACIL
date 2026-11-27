"use client";

import "./features-bento.css";
import { useEffect, useRef } from "react";

const I = ({ d }: { d: string }) => (
  <svg className="rc-i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
);
const ICONS = {
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};
const BARS = [45, 70, 55, 80, 62, 96, 30];
const WEEK = [["SEG", 23], ["TER", 24], ["QUA", 25], ["QUI", 26], ["SEX", 27], ["SÁB", 28], ["DOM", 29]] as const;

/** "Tudo o que seu negócio precisa": mosaico com uma mini demonstração em cada recurso. */
export function FeaturesBento() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: (() => void)[] = [];

    // brilho que segue o mouse
    el.querySelectorAll<HTMLElement>(".rc-ft").forEach((c) => {
      const f = (e: MouseEvent) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", `${e.clientX - r.left}px`);
        c.style.setProperty("--my", `${e.clientY - r.top}px`);
      };
      c.addEventListener("mousemove", f);
      cleanups.push(() => c.removeEventListener("mousemove", f));
    });

    // números e barras sobem quando aparecem
    const bars = el.querySelector(".rc-bars") as HTMLElement;
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((x) => x.isIntersecting)) return;
        io.disconnect();
        bars.querySelectorAll<HTMLElement>("i").forEach((b, i) => setTimeout(() => (b.style.height = `${b.dataset.h}%`), reduce ? 0 : i * 90));
        el.querySelectorAll<HTMLElement>(".rc-nums b").forEach((b) => {
          const to = Number(b.dataset.to);
          const money = b.hasAttribute("data-money");
          const t0 = performance.now();
          const f = (t: number) => {
            const p = reduce ? 1 : Math.min(1, (t - t0) / 1100);
            const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
            b.textContent = money ? `R$ ${v}` : String(v);
            if (p < 1) requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(bars);
    cleanups.push(() => io.disconnect());

    const day = el.querySelectorAll<HTMLElement>(".rc-wk div")[3];
    const msg = el.querySelector(".rc-blkmsg") as HTMLElement;
    if (reduce) {
      day.classList.add("rc-blk");
      msg.classList.add("on");
      return () => cleanups.forEach((c) => c());
    }

    // agenda: concluir o próximo e passar o destaque para o seguinte
    const rows = el.querySelectorAll<HTMLElement>(".rc-ag .rc-r");
    const bd = el.querySelector("[data-bd]") as HTMLElement;
    const btn = el.querySelector("[data-btn]") as HTMLElement;
    let st = 0;
    const t1 = setInterval(() => {
      if (st === 0) {
        btn.style.transform = "scale(.92)";
        setTimeout(() => (btn.style.transform = ""), 160);
        bd.className = "rc-bd rc-done";
        bd.textContent = "Concluído";
        rows[1].classList.remove("rc-hl");
        rows[2].classList.add("rc-hl");
      } else {
        bd.className = "rc-bd rc-next";
        bd.textContent = "Próximo";
        rows[1].classList.add("rc-hl");
        rows[2].classList.remove("rc-hl");
      }
      st = 1 - st;
    }, 2600);
    // folgas: bloqueia o feriado e libera de novo
    let on = false;
    const t2 = setInterval(() => {
      on = !on;
      day.classList.toggle("rc-blk", on);
      msg.classList.toggle("on", on);
    }, 2400);
    // claro x escuro: a linha passa de um lado para o outro
    const cmp = el.querySelector(".rc-cmp") as HTMLElement;
    const t0 = performance.now();
    let raf = 0;
    const slide = (t: number) => {
      const p = ((t - t0) / 5200) % 1;
      cmp.style.setProperty("--cut", `${20 + 60 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2))}%`);
      raf = requestAnimationFrame(slide);
    };
    raf = requestAnimationFrame(slide);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      cancelAnimationFrame(raf);
      cleanups.forEach((c) => c());
    };
  }, []);

  return (
    <div className="rc" ref={root}>
      <div className="rc-bento">
        <div className="rc-ft rc-span2">
          <span className="rc-ic rc-g-brand"><I d={ICONS.cal} /></span>
          <h3>Agenda do dia na palma da mão</h3>
          <p>Próximo cliente em destaque, concluir, marcar falta e remarcar com um toque.</p>
          <div className="rc-demo rc-ag" aria-hidden="true">
            <div className="rc-r"><span className="rc-tm">09:00</span><div><b>Carlos Lima</b><small>Barba · Pedro</small></div><span className="rc-bd rc-done">Concluído</span></div>
            <div className="rc-r rc-hl">
              <span className="rc-tm">10:30</span>
              <div>
                <b>Lia Souza</b><small>Corte masculino · João</small>
                <div className="rc-acts"><span className="rc-g-green" data-btn="">✓ Concluir</span><span className="rc-g-blue">Remarcar</span></div>
              </div>
              <span className="rc-bd rc-next" data-bd="">Próximo</span>
            </div>
            <div className="rc-r"><span className="rc-tm">11:00</span><div><b>Rafael Torres</b><small>Corte + barba · João</small></div><span className="rc-bd rc-conf">Confirmado</span></div>
          </div>
        </div>
        <div className="rc-ft">
          <span className="rc-ic rc-g-teal"><I d={ICONS.chart} /></span>
          <h3>Resumo do dia</h3>
          <p>Quantos atendimentos, quanto vai entrar e quantas faltas — sem planilha.</p>
          <div className="rc-demo" aria-hidden="true">
            <div className="rc-nums">
              <div><b data-to="9">0</b><small>Agendados</small></div>
              <div><b data-to="460" data-money="">R$ 0</b><small>Previsto</small></div>
              <div><b data-to="0">0</b><small>Faltas</small></div>
            </div>
            <div className="rc-bars">
              {BARS.map((h, i) => <i key={i} data-h={h} className={i === 5 ? "rc-today" : ""} />)}
            </div>
            <div className="rc-days7">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}</div>
          </div>
        </div>
        <div className="rc-ft">
          <span className="rc-ic rc-g-indigo"><I d={ICONS.users} /></span>
          <h3>Equipe com horários próprios</h3>
          <p>Cada profissional com seus serviços, dias e horários de trabalho.</p>
          <div className="rc-demo rc-team" aria-hidden="true">
            <div className="rc-r"><span className="rc-av rc-g-brand">J</span><b>João</b><span className="rc-h">Seg–Sáb · 9h–19h</span></div>
            <div className="rc-r"><span className="rc-av rc-g-blue">P</span><b>Pedro</b><span className="rc-h">Ter–Sáb · 10h–20h</span></div>
            <div className="rc-r"><span className="rc-av rc-g-purple">A</span><b>Ana</b><span className="rc-h rc-off">Folga hoje</span></div>
          </div>
        </div>
        <div className="rc-ft">
          <span className="rc-ic rc-g-amber"><I d={ICONS.lock} /></span>
          <h3>Folgas e bloqueios</h3>
          <p>Feriado, férias ou um compromisso: bloqueie e o horário some do link.</p>
          <div className="rc-demo" aria-hidden="true">
            <div className="rc-wk">{WEEK.map(([d, n]) => <div key={d}>{d}<b>{n}</b></div>)}</div>
            <div className="rc-blkmsg">
              <i className="rc-g-amber"><I d={ICONS.lock} /></i>Feriado · some do seu link
            </div>
          </div>
        </div>
        <div className="rc-ft">
          <span className="rc-ic rc-g-blue"><I d={ICONS.heart} /></span>
          <h3>Clientes organizados</h3>
          <p>Histórico de visitas e quanto cada cliente já gastou, montado sozinho.</p>
          <div className="rc-demo rc-cl" aria-hidden="true">
            <div className="rc-r"><span className="rc-av">L</span><div className="rc-s"><b>Lia Souza</b><small>12 visitas · R$ 480</small></div><span className="rc-vip">♥ Fiel</span></div>
            <div className="rc-r"><span className="rc-av">R</span><div className="rc-s"><b>Rafael Torres</b><small>5 visitas · R$ 260</small></div></div>
            <div className="rc-r"><span className="rc-av">C</span><div className="rc-s"><b>Carlos Lima</b><small>3 visitas · R$ 90</small></div></div>
          </div>
        </div>
        <div className="rc-ft rc-span3">
          <div className="rc-modo">
            <div>
              <span className="rc-ic rc-g-purple"><I d={ICONS.moon} /></span>
              <h3>Modo claro e escuro</h3>
              <p>No painel e na sua página. Escolha o que combina com você — e com o seu negócio.</p>
            </div>
            <div className="rc-cmp" aria-hidden="true">
              {["rc-light", "rc-dark"].map((c) => (
                <div key={c} className={`rc-side ${c}`}>
                  <span className="rc-lg"><span>B</span></span>
                  <div><b>Barbearia do João</b><small>Aberto agora · até 19h</small></div>
                  <span className="rc-pill">Agendar</span>
                </div>
              ))}
              <span className="rc-knob" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
