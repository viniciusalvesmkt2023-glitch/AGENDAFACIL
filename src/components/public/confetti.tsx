"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#22c55e", "#10b981", "#facc15", "#f97316", "#ec4899", "#3b82f6", "#a855f7"];

/** Chuva de confetes ao confirmar (canvas leve, some sozinho; respeita "reduzir movimento"). */
export function Confetti({ colors = COLORS }: { colors?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    // Duas "explosões" saindo dos cantos de baixo + algumas caindo do topo
    const parts = Array.from({ length: 150 }, (_, i) => {
      const fromLeft = i % 3 === 0;
      const fromTop = i % 3 === 2;
      return {
        x: fromTop ? Math.random() * W() : fromLeft ? -10 : W() + 10,
        y: fromTop ? -20 - Math.random() * 200 : window.innerHeight * 0.75,
        vx: fromTop ? (Math.random() - 0.5) * 2 : (fromLeft ? 1 : -1) * (4 + Math.random() * 7),
        vy: fromTop ? 2 + Math.random() * 3 : -(10 + Math.random() * 9),
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        round: Math.random() < 0.25,
      };
    });

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = t > 2600 ? Math.max(0, 1 - (t - 2600) / 900) : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // "Papel" girando: a largura varia para parecer 3D
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w * Math.abs(Math.cos(p.rot * 2)), p.h);
        }
        ctx.restore();
      }
      if (t < 3500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [colors]);

  return <canvas ref={ref} aria-hidden="true" data-testid="confetti" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 60 }} />;
}
