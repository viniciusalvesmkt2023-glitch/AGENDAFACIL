"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Bucket = { key: string; label: string; cents: number; count: number; current: boolean };

/** Gráfico de barras das vendas, com o valor ao passar o mouse (ou tocar). */
export function SalesChart({ buckets, label }: { buckets: Bucket[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(700);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 250, pl = 50, pb = 24, pt = 10, n = buckets.length;
  const max = Math.max(...buckets.map((b) => b.cents), 0);
  // topo "redondo" da escala (em reais)
  const reais = Math.max(max / 100, 10) * 1.12;
  const mag = Math.pow(10, Math.floor(Math.log10(reais)));
  const topReais = Math.ceil(reais / mag) * mag;
  const top = topReais * 100;
  const y = (v: number) => pt + (H - pb - pt) * (1 - v / top);
  const step = (w - pl) / n;
  const bw = Math.max(4, Math.min(34, step * 0.62));
  const every = n > 14 ? Math.ceil(n / 8) : 1;
  const tick = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR"));

  return (
    <div className="ad-chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Vendas ${label}`}>
        <defs>
          <linearGradient id="adBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9a3c" /><stop offset="1" stopColor="#fe6e02" /></linearGradient>
          <linearGradient id="adBarNow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4ade80" /><stop offset="1" stopColor="#16a34a" /></linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (top / 4) * k;
          return (
            <g key={k}>
              <line className="ad-grid-l" x1={pl} x2={w} y1={y(v)} y2={y(v)} />
              <text className="ad-axis" x={pl - 8} y={y(v) + 3} textAnchor="end">{tick((topReais / 4) * k)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const x = pl + step * i + (step - bw) / 2;
          const h = b.cents ? Math.max(3, H - pb - y(b.cents)) : 0;
          return (
            <g key={b.key}>
              {h > 0 && (
                <path
                  className={`ad-bar ${hover !== null && hover !== i ? "dim" : ""}`}
                  fill={b.current ? "url(#adBarNow)" : "url(#adBar)"}
                  d={`M${x},${H - pb} V${H - pb - h + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - pb} Z`}
                />
              )}
              {(i % every === 0 || i === n - 1) && <text className="ad-axis" x={x + bw / 2} y={H - 6} textAnchor="middle">{b.label}</text>}
              <rect className="ad-hit" x={pl + step * i} y={pt} width={step} height={H - pb - pt} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="ad-tip on" style={{ left: `${((pl + step * hover + step / 2) / w) * 100}%`, top: y(buckets[hover].cents) }}>
          <b>{formatMoney(buckets[hover].cents)}</b>
          {buckets[hover].label} · {buckets[hover].count} venda{buckets[hover].count === 1 ? "" : "s"}
          {buckets[hover].current ? " · agora" : ""}
        </div>
      )}
      {max === 0 && <p className="ad-empty">Nenhuma venda nesse período ainda.</p>}
    </div>
  );
}

/** Atualiza a visão geral sozinha (vendas novas aparecem sem recarregar a página). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
