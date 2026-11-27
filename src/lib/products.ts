// Produtos: situação do estoque e tipos de movimentação.

export type StockState = "OUT" | "LOW" | "OK";

/** Sem estoque (0 ou menos), estoque baixo (chegou no mínimo avisado) ou em estoque. */
export function stockState(stock: number, minStock: number | null | undefined): StockState {
  if (stock <= 0) return "OUT";
  if (minStock != null && stock <= minStock) return "LOW";
  return "OK";
}

export const STOCK_LABEL: Record<StockState, { label: string; color: string }> = {
  OUT: { label: "Sem estoque", color: "#ef4444" },
  LOW: { label: "Estoque baixo", color: "#f59e0b" },
  OK: { label: "Em estoque", color: "#16a34a" },
};

export const MOVE_KINDS = { IN: "Entrada", OUT: "Saída", SALE: "Venda" } as const;
export type MoveKind = keyof typeof MOVE_KINDS;
export const isMoveKind = (v: unknown): v is MoveKind => typeof v === "string" && v in MOVE_KINDS;
