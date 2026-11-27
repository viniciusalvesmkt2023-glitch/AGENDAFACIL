"use client";

import { useRouter } from "next/navigation";

/** Filtros do histórico de estoque (produto e tipo). */
export function StockFilters({ products, productId, kind }: { products: { id: string; name: string }[]; productId: string; kind: string }) {
  const router = useRouter();
  const go = (p: string, k: string) => {
    const s = new URLSearchParams();
    if (p) s.set("produto", p);
    if (k) s.set("tipo", k);
    router.push(`/painel/produtos/estoque${s.size ? `?${s}` : ""}`);
  };
  return (
    <div className="pd-filters">
      <select className="am-in" value={productId} onChange={(e) => go(e.target.value, kind)} aria-label="Produto" data-testid="st-product">
        <option value="">Todos os produtos</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select className="am-in" value={kind} onChange={(e) => go(productId, e.target.value)} aria-label="Tipo" data-testid="st-kind">
        <option value="">Todos os tipos</option>
        <option value="IN">Entrada</option>
        <option value="OUT">Saída</option>
        <option value="SALE">Venda</option>
      </select>
    </div>
  );
}
