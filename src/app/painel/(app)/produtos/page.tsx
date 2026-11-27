import Link from "next/link";
import { ClipboardList, Download, Package, Pencil, Plus, ShoppingCart } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { localToUtc, nowInTimezone } from "@/lib/time";
import { STOCK_LABEL, stockState } from "@/lib/products";
import { ProductButton, ProductDialogs } from "./dialogs";
import { ProductSearch } from "./search";
import "../agendamentos/agendamentos.css";
import "./produtos.css";

type Props = { searchParams: Promise<{ q?: string }> };
const money = (c: number) => formatMoney(c).replace(",00", "");

export default async function ProductsPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 60);
  const monthStart = localToUtc(`${nowInTimezone().date.slice(0, 7)}-01`, 0);
  const [products, sold] = await Promise.all([
    db.product.findMany({ where: { businessId: user.businessId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.stockMove.aggregate({ where: { businessId: user.businessId, kind: "SALE", createdAt: { gte: monthStart } }, _sum: { totalCents: true }, _count: true }),
  ]);
  const shown = term ? products.filter((p) => p.name.toLowerCase().includes(term.toLowerCase()) || (p.code ?? "").includes(term)) : products;
  const low = products.filter((p) => p.active && stockState(p.stock, p.minStock) !== "OK").length;
  const value = products.reduce((s, p) => s + Math.max(0, p.stock) * (p.costCents ?? p.priceCents), 0);
  const sellers = await db.professional.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const lite = products.map((p) => ({ id: p.id, name: p.name, code: p.code, priceCents: p.priceCents, costCents: p.costCents, stock: p.stock, minStock: p.minStock, description: p.description, imageId: p.imageId, active: p.active }));

  return (
    <div className="am space-y-4">
      <div className="am-top">
        <div className="min-w-0">
          <h1 className="pn-h1">Produtos</h1>
          <p className="pn-hello">Catálogo, estoque e vendas de produtos (pomadas, óleos, acessórios…).</p>
        </div>
        <div className="am-acts">
          <a href="/painel/produtos/exportar" className="pn-btn pn-g-green" download>
            <Download /> <span className="am-t">Exportar</span>
          </a>
          <Link href="/painel/produtos/estoque" className="pn-btn soft">
            <ClipboardList /> <span className="am-t">Estoque</span>
          </Link>
          <ProductButton open={{ kind: "sell" }} className="pn-btn soft" testid="pd-sell">
            <ShoppingCart /> <span className="am-t">Registrar venda</span>
          </ProductButton>
          <ProductButton open={{ kind: "new" }} className="pn-btn pn-g-brand" testid="pd-new">
            <Plus /> Novo produto
          </ProductButton>
        </div>
      </div>

      <div className="am-kpis">
        <div className="pn-card am-kpi">
          <small>Produtos</small>
          <b>{products.filter((p) => p.active).length}</b>
        </div>
        <div className="pn-card am-kpi ok">
          <small>Vendido no mês</small>
          <b data-testid="pd-sold">{money(sold._sum.totalCents ?? 0)}</b>
        </div>
        <div className="pn-card am-kpi warn">
          <small>Estoque baixo ou zerado</small>
          <b data-testid="pd-low">{low}</b>
        </div>
        <div className="pn-card am-kpi">
          <small>Valor em estoque</small>
          <b>{money(value)}</b>
        </div>
      </div>

      {products.length > 0 && <ProductSearch value={term} />}

      <div className="pn-card am-tbl">
        {products.length === 0 ? (
          <div className="pd-empty">
            <span className="pd-g-teal">
              <Package />
            </span>
            <b>Nenhum produto ainda</b>
            <p>Cadastre o que você vende no balcão (pomada, óleo, shampoo…) e controle o estoque por aqui.</p>
            <ProductButton open={{ kind: "new" }} className="pn-btn pn-g-brand">
              <Plus /> Cadastrar primeiro produto
            </ProductButton>
          </div>
        ) : shown.length === 0 ? (
          <p className="am-empty">Nenhum produto com “{term}”.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Preço</th>
                  <th className="num">Estoque</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const st = STOCK_LABEL[stockState(p.stock, p.minStock)];
                  return (
                    <tr key={p.id} className={p.active ? "" : "pd-off"} data-testid="pd-row">
                      <td>
                        <div className="pd-prod">
                          <Thumb imageId={p.imageId} />
                          <div className="am-who min-w-0">
                            <b>{p.name}</b>
                            <small>
                              {p.code || "sem código"}
                              {p.active ? "" : " · oculto"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="num">{money(p.priceCents)}</td>
                      <td className="num">
                        <b>{p.stock}</b> un.
                      </td>
                      <td>
                        <span className="am-pill" style={{ ["--c" as string]: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="am-rowacts">
                          {p.active && (
                            <ProductButton open={{ kind: "sell", id: p.id }} className="pn-btn sm soft" testid="pd-row-sell">
                              <ShoppingCart /> Vender
                            </ProductButton>
                          )}
                          <ProductButton open={{ kind: "move", move: "IN", id: p.id }} className="am-ib" title="Lançar entrada">
                            <Plus />
                          </ProductButton>
                          <ProductButton open={{ kind: "edit", id: p.id }} className="am-ib" title="Editar" testid="pd-row-edit">
                            <Pencil />
                          </ProductButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="am-cards">
              {shown.map((p) => {
                const st = STOCK_LABEL[stockState(p.stock, p.minStock)];
                return (
                  <div key={p.id} className={`am-card pd-card ${p.active ? "" : "pd-off"}`}>
                    <Thumb imageId={p.imageId} />
                    <div className="min-w-0">
                      <b className="am-n">{p.name}</b>
                      <small className="am-s">
                        {money(p.priceCents)} · {p.stock} un.
                      </small>
                      <div className="am-pills">
                        <span className="am-pill" style={{ ["--c" as string]: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                    <div className="am-r">
                      {p.active && (
                        <ProductButton open={{ kind: "sell", id: p.id }} className="am-ib" title="Vender">
                          <ShoppingCart />
                        </ProductButton>
                      )}
                      <ProductButton open={{ kind: "edit", id: p.id }} className="am-ib" title="Editar">
                        <Pencil />
                      </ProductButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {products.length > 0 && (
          <div className="am-foot">
            <span>
              {shown.length} produto{shown.length === 1 ? "" : "s"}
            </span>
            <span className="hidden sm:inline">Estoque baixo aparece em amarelo</span>
          </div>
        )}
      </div>
      <ProductDialogs products={lite} professionals={sellers} />
    </div>
  );
}

function Thumb({ imageId }: { imageId: string | null }) {
  return imageId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/i/${imageId}`} alt="" className="pd-thumb" />
  ) : (
    <span className="pd-thumb pd-thumb-empty">
      <Package />
    </span>
  );
}
