// "Luz do fundo" da página do cliente: brilhos suaves atrás do conteúdo.
export const GLOWS = [
  { id: "BRAND", label: "Da cor", colors: null },
  { id: "NONE", label: "Sem luz", colors: null },
  { id: "GRAFITE", label: "Grafite", colors: ["#71717a", "#3f3f46"] },
  { id: "MEIA_NOITE", label: "Meia-noite", colors: ["#1e40af", "#312e81"] },
  { id: "OCEANO", label: "Oceano", colors: ["#0e7490", "#1d4ed8"] },
  { id: "POR_DO_SOL", label: "Pôr do sol", colors: ["#ea580c", "#be185d"] },
  { id: "AMETISTA", label: "Ametista", colors: ["#7c3aed", "#c026d3"] },
  { id: "CHAMPAGNE", label: "Champagne", colors: ["#ca8a04", "#9a3412"] },
] as const;

export const isGlow = (v: unknown): v is string => GLOWS.some((g) => g.id === v);

/** Cores das duas luzes (CSS). BRAND usa a cor do salão; NONE apaga. */
export function glowColors(id: string, brand: string): [string, string] {
  if (id === "NONE") return ["transparent", "transparent"];
  const g = GLOWS.find((x) => x.id === id);
  return g?.colors ? [g.colors[0], g.colors[1]] : [brand, brand];
}
