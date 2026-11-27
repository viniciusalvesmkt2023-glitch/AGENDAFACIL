import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatMoney, formatPhone } from "@/lib/format";
import { MOVE_KINDS, isMoveKind } from "@/lib/products";
import { methodLabel } from "@/lib/quick-book";
import { ProductButton, ProductDialogs } from "../dialogs";
import { StockFilters } from "./filters";
import "../../agendamentos/agendamentos.css";
import "../produtos.css";

type Props = { searchParams: Promise<{ produto?: string; tipo?: string }> };
const COLOR = { IN: "#16a34a", OUT: "#ef4444", SALE: "#3b82f6" } as const;
const when = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(d).replace(",", "");

export default async function StockPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const p = await searchParams;
  const kind = isMoveKind(p.tipo) ? p.tipo : "";
  const products = await db.product.findMany({ where: { businessId: user.businessId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  const productId = products.some((x) => x.id === p.produto) ? p.produto! : "";
  const moves = await db.stockMove.findMany({
    where: { businessId: user.businessId, ...(productId ? { productId } : {}), ...(kind ? { kind } : {}) },
    include: { product: { select: { name: true } }, client: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const sellers = await db.professional.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const lite = products.map((x) => ({ id: x.id, name: x.name, code: x.code, priceCents: x.priceCents, costCents: x.costCents, stock: x.stock, minStock: x.minStock, description: x.description, imageId: x.imageId, active: x.active }));
  const detail = (m: (typeof moves)[number]) =>
    m.kind === "SALE"
      ? [m.client ? m.client.name : "Balcão", methodLabel(m.paymentMethod) || null, m.totalCents != null ? formatMoney(m.totalCents).replace(",00", "") : null].filter(Boolean).join(" · ")
      : (m.note ?? "—");

  return (
    <div className="am space-y-4">
      <Link href="/painel/produtos" className="pd-back">
        <ArrowLeft /> Produtos
      </Link>
      <div className="am-top">
        <div className="min-w-0">
          <h1 className="pn-h1">Controle de estoque</h1>
          <p className="pn-hello">Histórico de entradas, saídas e vendas de cada produto.</p>
        </div>
        <div className="am-acts">
          <ProductButton open={{ kind: "move", move: "OUT", id: productId || undefined }} className="pn-btn soft" testid="st-out">
            <Minus /> Lançar saída
          </ProductButton>
          <ProductButton open={{ kind: "move", move: "IN", id: productId || undefined }} className="pn-btn pn-g-brand" testid="st-in">
            <Plus /> Lançar entrada
          </ProductButton>
        </div>
      </div>

      <StockFilters products={products.map((x) => ({ id: x.id, name: x.name }))} productId={productId} kind={kind} />

      <div className="pn-card am-tbl">
        {moves.length === 0 ? (
          <p className="am-empty">Nenhuma movimentação{productId || kind ? " com esses filtros" : " ainda"}.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th className="num">Qtd.</th>
                  <th className="num">Saldo</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} data-testid="st-row">
                    <td>{when(m.createdAt)}</td>
                    <td>
                      <b>{m.product.name}</b>
                    </td>
                    <td>
                      <span className="am-pill" style={{ ["--c" as string]: COLOR[m.kind as keyof typeof COLOR] ?? "#a1a1aa" }}>
                        {MOVE_KINDS[m.kind as keyof typeof MOVE_KINDS] ?? m.kind}
                      </span>
                    </td>
                    <td className={`num pd-q ${m.quantity > 0 ? "in" : "out"}`}>
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                    <td className="num">{m.balance}</td>
                    <td className="am-muted">{detail(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="am-cards">
              {moves.map((m) => (
                <div key={m.id} className="am-card">
                  <div className="am-tm">
                    <b className={`pd-q ${m.quantity > 0 ? "in" : "out"}`}>
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </b>
                    <small>{when(m.createdAt).slice(0, 5)}</small>
                  </div>
                  <div className="min-w-0">
                    <b className="am-n">{m.product.name}</b>
                    <small className="am-s">
                      {MOVE_KINDS[m.kind as keyof typeof MOVE_KINDS] ?? m.kind} · {detail(m)}
                    </small>
                  </div>
                  <div className="am-r">
                    <small className="am-muted">saldo</small>
                    <b>{m.balance}</b>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="am-foot">
          <span>
            {moves.length} movimentaç{moves.length === 1 ? "ão" : "ões"}
            {moves.length === 300 ? " (as 300 mais recentes)" : ""}
          </span>
          <span />
        </div>
      </div>
      <ProductDialogs products={lite} professionals={sellers} />
    </div>
  );
}
