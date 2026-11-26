// Cor personalizada da página pública: gera os tons que o sistema usa (fundos claros, botões, textos).
// Os botões têm texto branco, então o tom "600" é escurecido até ter contraste suficiente.

export const DEFAULT_BRAND = "#E85F00";

export const COLOR_PRESETS = [
  { name: "Laranja", hex: "#E85F00" },
  { name: "Dourado", hex: "#C9A227" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Verde", hex: "#059669" },
  { name: "Vermelho", hex: "#DC2626" },
  { name: "Roxo", hex: "#7C3AED" },
  { name: "Rosa", hex: "#DB2777" },
  { name: "Preto", hex: "#18181B" },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX_RE.test(v);

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

function luminance([r, g, b]: RGB) {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** Contraste entre duas cores (1 a 21). Texto normal precisa de pelo menos 4,5. */
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Tons da cor no formato das variáveis do Tailwind (--color-brand-50 ... --color-brand-900). */
export function brandPalette(hex: string | null | undefined): Record<string, string> {
  const base = toRgb(isHexColor(hex) ? hex : DEFAULT_BRAND);
  // Tom dos botões: a própria cor, escurecida até o texto branco ficar legível
  let t = 0;
  let c600 = base;
  while (contrast(toHex(c600), "#ffffff") < 4.5 && t < 0.9) {
    t += 0.05;
    c600 = mix(base, BLACK, t);
  }
  const shades: Record<string, RGB> = {
    "50": mix(base, WHITE, 0.92),
    "100": mix(base, WHITE, 0.84),
    "200": mix(base, WHITE, 0.68),
    "300": mix(base, WHITE, 0.45),
    "500": base,
    "600": c600,
    "700": mix(c600, BLACK, 0.18),
    "900": mix(c600, BLACK, 0.55),
  };
  return Object.fromEntries(Object.entries(shades).map(([k, v]) => [`--color-brand-${k}`, toHex(v)]));
}
