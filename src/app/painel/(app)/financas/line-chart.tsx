"use client";

import { useEffect, useRef, useState } from "react";

type Point = { key: string; label: string; appts: number; products: number };

const money = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const short = (c: number) => (c >= 100000 ? `R$ ${(c / 100000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : money(c));

/** Gráfico de linha do faturamento (total), com área suave, linhas de grade e detalhe ao passar o dedo/mouse. */
export function LineChart({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 210, padL = 8, padR = 8, padT = 14, padB = 26;
  const totals = points.map((p) => p.appts + p.products);
  const max = Math.max(1, ...totals);
  // topo "redondo" para as linhas de grade
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const top = Math.ceil(max / step) * step;
  const innerW = Math.max(10, w - padL - padR);
  const x = (i: number) => padL + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const line = totals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.5, 1].map((f) => top * f);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 70))));
  const empty = totals.every((v) => v === 0);

  function move(clientX: number) {
    const r = ref.current!.getBoundingClientRect();
    const rel = clientX - r.left - padL;
    const i = points.length === 1 ? 0 : Math.round((rel / innerW) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div className="fn-chart" ref={ref} onMouseMove={(e) => move(e.clientX)} onMouseLeave={() => setHover(null)} onTouchStart={(e) => move(e.touches[0].clientX)} onTouchMove={(e) => move(e.touches[0].clientX)}>
      <svg width={w} height={H} role="img" aria-label="Faturamento no período">
        <defs>
          <linearGradient id="fn-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--b)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--b)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="fn-grid" />
            {t > 0 && (
              <text x={padL} y={y(t) - 4} textAnchor="start" className="fn-axis">
                {short(t)}
              </text>
            )}
          </g>
        ))}
        {!empty && <path d={area} fill="url(#fn-area)" />}
        {!empty && <path d={line} fill="none" stroke="var(--b)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {points.length <= 31 &&
          !empty &&
          totals.map((v, i) => <circle key={points[i].key} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 2.5} className="fn-dot" />)}
        {points.map((p, i) =>
          (i % every === 0 && (i === 0 || points.length - 1 - i >= every * 0.7)) || i === points.length - 1 ? (
            <text key={p.key} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fn-axis">
              {p.label}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} className="fn-cross" />}
      </svg>
      {empty && <p className="fn-chart-empty">Sem faturamento pago no período.</p>}
      {hover !== null && !empty && (
        <div className="fn-tip" style={{ left: Math.min(w - 170, Math.max(0, x(hover) - 80)) }}>
          <b>{points[hover].label}</b>
          <span>Atendimentos {money(points[hover].appts)}</span>
          <span>Produtos {money(points[hover].products)}</span>
          <b>Total {money(totals[hover])}</b>
        </div>
      )}
    </div>
  );
}
