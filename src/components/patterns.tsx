import { Eye, Flower2, Heart, Leaf, Scissors, Sparkles } from "lucide-react";
import type { BusinessTypeId } from "@/lib/business-types";

// Desenhos de fundo da página pública (padrão repetido, bem suave).
// Ícones próprios no mesmo estilo dos ícones do sistema (24x24, só contorno).

type IconProps = { x?: number; y?: number; width?: number; height?: number; strokeWidth?: number };
const base = (p: IconProps) => ({
  x: p.x,
  y: p.y,
  width: p.width ?? 24,
  height: p.height ?? 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const Lipstick = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="8" y="13" width="8" height="8" rx="1" />
    <path d="M9 13v-3h6v3" />
    <path d="M10 10V5l4-2v7" />
  </svg>
);
const NailPolish = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9.5" y="2" width="5" height="6" rx="1" />
    <path d="M10.5 8v2.5M13.5 8v2.5" />
    <rect x="7" y="10.5" width="10" height="11" rx="2.5" />
  </svg>
);
const Comb = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="4" rx="1" />
    <path d="M5 10v7M8 10v7M11 10v7M14 10v7M17 10v7M20 10v4" />
  </svg>
);
const Razor = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8.5 15.5 18 6a2.1 2.1 0 0 0-3-3L5.5 12.5z" />
    <path d="M8.5 15.5 3 21" />
    <path d="M12 9l2 2" />
  </svg>
);
const Mustache = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 11.5c-1.2-1.8-3.6-3-5.6-1.6C4.8 11 4.2 13 2 12.6c.9 2.8 4.8 3.4 6.8 2 1.4-.9 2.3-1.6 3.2-1.6s1.8.7 3.2 1.6c2 1.4 5.9.8 6.8-2-2.2.4-2.8-1.6-4.4-2.7-2-1.4-4.4-.2-5.6 1.6z" />
  </svg>
);
const Dot = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </svg>
);

type Icon = (p: IconProps) => React.ReactNode;

export const PATTERNS: { id: string; label: string; icon: Icon; for: BusinessTypeId[] }[] = [
  { id: "SCISSORS", label: "Tesouras", icon: Scissors, for: ["BARBEARIA", "SALAO"] },
  { id: "MUSTACHE", label: "Bigode", icon: Mustache, for: ["BARBEARIA"] },
  { id: "RAZOR", label: "Navalha", icon: Razor, for: ["BARBEARIA"] },
  { id: "COMB", label: "Pente", icon: Comb, for: ["BARBEARIA", "SALAO"] },
  { id: "LIPSTICK", label: "Batom", icon: Lipstick, for: ["SALAO", "SOBRANCELHA", "ESTETICA"] },
  { id: "POLISH", label: "Esmalte", icon: NailPolish, for: ["UNHAS"] },
  { id: "SPARKLES", label: "Brilhos", icon: Sparkles, for: ["SALAO", "UNHAS", "SOBRANCELHA"] },
  { id: "EYE", label: "Olhar", icon: Eye, for: ["SOBRANCELHA"] },
  { id: "HEART", label: "Corações", icon: Heart, for: ["UNHAS", "ESTETICA", "SAUDE", "OUTRO"] },
  { id: "FLOWER", label: "Flores", icon: Flower2, for: ["ESTETICA", "SALAO", "UNHAS"] },
  { id: "LEAF", label: "Folhas", icon: Leaf, for: ["ESTETICA", "SAUDE", "OUTRO"] },
  { id: "DOTS", label: "Pontinhos", icon: Dot, for: [] },
];

export const isPattern = (v: unknown): v is string => v === "NONE" || PATTERNS.some((p) => p.id === v);

/** Desenhos sugeridos primeiro para o tipo de negócio. */
export function patternsFor(type: string) {
  const match = PATTERNS.filter((p) => p.for.includes(type as BusinessTypeId));
  return [...match, ...PATTERNS.filter((p) => !match.includes(p))];
}

/**
 * Camada com o desenho repetido. Fica atrás do conteúdo (position absolute, sem clique).
 * Cada "ladrilho" tem dois ícones inclinados, para não parecer uma grade.
 */
export function PatternLayer({ pattern, uid, className = "", size = 84 }: { pattern: string; uid: string; className?: string; size?: number }) {
  // id único por camada: a cor (currentColor) do desenho vem de onde o <pattern> foi definido
  const id = `pat-${uid}-${pattern}`;
  const def = PATTERNS.find((p) => p.id === pattern);
  if (!def) return null;
  const Icon = def.icon;
  const s = size;
  const icon = s * 0.34;
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <g transform={`rotate(-18 ${s * 0.25} ${s * 0.25})`}>
            <Icon x={s * 0.25 - icon / 2} y={s * 0.25 - icon / 2} width={icon} height={icon} strokeWidth={1.5} />
          </g>
          <g transform={`rotate(20 ${s * 0.75} ${s * 0.75})`}>
            <Icon x={s * 0.75 - icon / 2} y={s * 0.75 - icon / 2} width={icon} height={icon} strokeWidth={1.5} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Amostra para a escolha do desenho (quadradinho com o padrão). */
export function PatternSwatch({ pattern }: { pattern: string }) {
  return (
    <span className="relative block h-full w-full overflow-hidden text-brand-600">
      <PatternLayer pattern={pattern} uid="amostra" size={44} className="opacity-70" />
    </span>
  );
}
