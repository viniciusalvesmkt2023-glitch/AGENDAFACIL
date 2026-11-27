"use client";

import "./whatsapp-demo.css";
import { useEffect, useRef } from "react";

const CONF =
  'Olá, Lia! ✅ Seu horário em <b>Barbearia do João</b> está confirmado para amanhã às 09:30.<br>✂️ Corte masculino com João<br><a>horaboa.com/agendamento/…</a><span class="wa-tm">14:02</span>';
const LEMB =
  'Olá, Lia! ⏰ Passando para lembrar do seu horário em <b>Barbearia do João</b> hoje às 09:30.<br>✂️ Corte masculino com João<span class="wa-tm">08:30</span>';
const REPLY = "Combinado, estarei aí! 👍";

/**
 * Card "WhatsApp automático": chega a confirmação, depois o lembrete, o cliente responde
 * e a barbearia responde de volta — tudo no WhatsApp do próprio estabelecimento.
 */
export function WhatsAppDemo({ listId }: { listId: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const msgs = el.querySelector(".wa-msgs") as HTMLDivElement;
    const box = el.querySelector(".wa-box") as HTMLDivElement;
    const send = el.querySelector(".wa-send") as HTMLSpanElement;
    const st = el.querySelector("[data-status]") as HTMLElement;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const live = (k: string) => document.querySelectorAll<HTMLElement>(`#${listId} > li`).forEach((li) => li.classList.toggle("live", li.dataset.k === k));
    const add = (html: string, cls: string) => {
      const d = document.createElement("div");
      d.className = cls;
      d.innerHTML = html;
      msgs.appendChild(d);
      return d;
    };
    const typing = (ms: number, after: () => void) => {
      st.textContent = "digitando...";
      const t = add("<i></i><i></i><i></i>", "wa-typing");
      later(ms, () => {
        t.remove();
        st.textContent = "online";
        after();
      });
    };
    const type = (text: string, ms: number, done: () => void) => {
      let i = 0;
      const run = () => {
        i++;
        box.innerHTML = `${text.slice(0, i)}<span class="wa-caret"></span>`;
        if (i < text.length) timers.push(setTimeout(run, ms / text.length));
        else later(300, done);
      };
      run();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      add("HOJE", "wa-day");
      add(CONF, "wa-msg");
      add("No dia seguinte", "wa-day skip");
      add(LEMB, "wa-msg");
      add(`${REPLY}<span class="wa-tm">08:41 <span class="wa-tk read">✓✓</span></span>`, "wa-msg me");
      return;
    }

    const play = () => {
      timers.forEach(clearTimeout);
      timers = [];
      msgs.innerHTML = "";
      box.textContent = "";
      st.textContent = "online";
      live("");
      add("HOJE", "wa-day");
      later(600, () => typing(1300, () => { add(CONF, "wa-msg"); live("conf"); }));
      later(3300, () => add("No dia seguinte", "wa-day skip"));
      later(4100, () => typing(1200, () => { add(LEMB, "wa-msg"); live("lemb"); }));
      later(6400, () => {
        live("");
        type(REPLY, 1500, () => {
          send.classList.add("press");
          later(180, () => send.classList.remove("press"));
          box.textContent = "";
          const m = add(`${REPLY}<span class="wa-tm">08:41 <span class="wa-tk">✓</span></span>`, "wa-msg me");
          later(700, () => {
            const tk = m.querySelector(".wa-tk") as HTMLElement;
            tk.textContent = "✓✓";
            later(500, () => tk.classList.add("read"));
          });
        });
      });
      later(10200, () => typing(1300, () => add('Te esperamos, Lia! 💈<span class="wa-tm">08:43</span>', "wa-msg")));
      later(15500, play);
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
      live("");
    };
  }, [listId]);

  return (
    <div className="wa" ref={root} aria-hidden="true">
      <div className="wa-chat">
        <div className="wa-ctop">
          <span className="wa-av wa-g-brand">B</span>
          <div><b>Barbearia do João</b><small data-status="">online</small></div>
        </div>
        <div className="wa-msgs" />
        <div className="wa-cin">
          <div className="wa-box" />
          <span className="wa-send">
            <svg className="wa-i" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
