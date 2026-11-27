import Link from "next/link";
import { ArrowRight, Download, Trash2 } from "lucide-react";
import { requireActiveUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { nowInTimezone } from "@/lib/time";
import { PERIODS } from "@/lib/appointments-list";
import { EXPENSE_CATEGORIES, growth } from "@/lib/finance";
import { FIN_PERIODS, loadFinance, readRange, type FinParams } from "./data";
import { LineChart } from "./line-chart";
import { ExpenseForm, FeesForm, PrintButton } from "./forms";
import { removeExpense } from "./actions";
import "../agendamentos/agendamentos.css";
import "./financas.css";

type Props = { searchParams: Promise<FinParams> };

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "equipe", label: "Equipe e serviços" },
  { id: "pagamentos", label: "Pagamentos e taxas" },
  { id: "extrato", label: "Extrato" },
  { id: "despesas", label: "Despesas" },
] as const;
const EXTRATO = [
  { id: "", label: "Tudo" },
  { id: "ATEND", label: "Atendimentos" },
  { id: "PROD", label: "Produtos" },
  { id: "DESP", label: "Despesas" },
  { id: "RECEBER", label: "A receber" },
] as const;
const money = (c: number) => formatMoney(c).replace(",00", "");
const dm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export default async function FinancePage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const p = await searchParams;
  const today = nowInTimezone().date;
  const r = readRange(p, today);
  const tab = TABS.some((t) => t.id === p.aba) ? p.aba! : "resumo";
  const b = user.business;
  const d = await loadFinance(b, r.from, r.to);
  const g = growth(d.gross, d.prevGross);
  const margin = d.gross ? Math.round((d.net / d.gross) * 1000) / 10 : 0;

  const qs = (patch: Record<string, string>) => {
    const s = new URLSearchParams({ periodo: r.period, ...(r.period === "datas" ? { de: r.from, ate: r.to } : {}), aba: tab, ...(p.f ? { f: p.f } : {}), ...patch });
    for (const [k, v] of [...s.entries()]) if (!v) s.delete(k);
    return `/painel/financas?${s}`;
  };
  const rangeLabel = r.from === r.to ? dm(r.from) : `${dm(r.from)} a ${dm(r.to)}`;
  const lines = p.f ? d.lines.filter((l) => l.kind === p.f) : d.lines;

  return (
    <div className="am fn space-y-4">
      <div className="am-top">
        <div className="min-w-0">
          <h1 className="pn-h1">Finanças</h1>
          <p className="pn-hello">
            Faturamento, custos, comissões e lucro · {rangeLabel}. Conta só o que foi <b>pago</b>.
          </p>
        </div>
        <div className="am-acts fn-noprint">
          <a href={`/painel/financas/exportar?${new URLSearchParams({ periodo: r.period, de: r.from, ate: r.to })}`} className="pn-btn pn-g-green" download data-testid="fn-export">
            <Download /> <span className="am-t">Exportar Excel</span>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="am-chips fn-noprint">
        {PERIODS.filter((x) => (FIN_PERIODS as readonly string[]).includes(x.id)).map((x) => (
          <Link key={x.id} href={qs({ periodo: x.id, de: "", ate: "" })} className={`am-chip ${r.period === x.id ? "on" : ""}`}>
            {x.label}
          </Link>
        ))}
      </div>
      {r.period === "datas" && (
        <form className="fn-dates fn-noprint" action="/painel/financas">
          <input type="hidden" name="periodo" value="datas" />
          <input type="hidden" name="aba" value={tab} />
          <input className="am-in" type="date" name="de" defaultValue={r.from} aria-label="De" />
          <span>até</span>
          <input className="am-in" type="date" name="ate" defaultValue={r.to} aria-label="Até" />
          <button className="pn-btn soft">Ver</button>
        </form>
      )}

      <nav className="fn-tabs fn-noprint" aria-label="Seções">
        {TABS.map((t) => (
          <Link key={t.id} href={qs({ aba: t.id, f: "" })} className={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "resumo" && (
        <>
          <div className="fn-kpis">
            <div className="pn-card fn-kpi pos">
              <small>Faturamento bruto</small>
              <b data-testid="fn-gross">{money(d.gross)}</b>
              <em>{g === null ? "sem período anterior para comparar" : `${g >= 0 ? "▲" : "▼"} ${Math.abs(g).toLocaleString("pt-BR")}% vs período anterior`}</em>
            </div>
            <div className="pn-card fn-kpi neg">
              <small>Taxas (maquininha)</small>
              <b data-testid="fn-fees">− {money(d.fees)}</b>
              <em>pelas taxas de cada forma</em>
            </div>
            <div className="pn-card fn-kpi neg">
              <small>Comissões</small>
              <b data-testid="fn-comm">− {money(d.commissions)}</b>
              <em>a pagar à equipe</em>
            </div>
            <div className="pn-card fn-kpi neg">
              <small>Custos e despesas</small>
              <b>− {money(d.cogs + d.expenseTotal)}</b>
              <em>produtos + despesas</em>
            </div>
            <div className={`fn-kpi big ${d.net < 0 ? "loss" : ""}`}>
              <small>{d.net < 0 ? "Prejuízo no período" : "Lucro líquido"}</small>
              <b data-testid="fn-net">{money(d.net)}</b>
              <em>{d.net < 0 ? "custos e despesas maiores que o faturamento" : d.gross ? `${margin.toLocaleString("pt-BR")}% do bruto` : "—"}</em>
            </div>
          </div>
          <div className="fn-grid2">
            <div className="pn-card fn-box">
              <h3>Faturamento {d.points.length === 1 || r.from === r.to ? "por hora" : d.points.length > 62 || d.points[0]?.key.length === 7 ? "por mês" : "por dia"}</h3>
              <p className="fn-d">Passe o mouse (ou o dedo) na linha para ver o valor.</p>
              <LineChart points={d.points} />
            </div>
            <div className="fn-stack">
              <div className="pn-card fn-box">
                <h3>De onde veio</h3>
                <div className="fn-orig">
                  <div>
                    <span>Atendimentos</span>
                    <b>{money(d.apptGross)}</b>
                    <i>
                      <u style={{ width: `${d.gross ? (d.apptGross / d.gross) * 100 : 0}%`, background: "var(--b)" }} />
                    </i>
                  </div>
                  <div>
                    <span>Produtos</span>
                    <b>{money(d.salesGross)}</b>
                    <i>
                      <u style={{ width: `${d.gross ? (d.salesGross / d.gross) * 100 : 0}%`, background: "#14b8a6" }} />
                    </i>
                  </div>
                </div>
              </div>
              <div className="pn-card fn-box">
                <h3>Como chegou no lucro</h3>
                <div className="fn-dre">
                  <div>
                    <span>Faturamento bruto</span>
                    <b>{money(d.gross)}</b>
                  </div>
                  <div className="m">
                    <span>− Taxas de pagamento</span>
                    <span>{money(d.fees)}</span>
                  </div>
                  <div className="m">
                    <span>− Comissões</span>
                    <span>{money(d.commissions)}</span>
                  </div>
                  <div className="m">
                    <span>− Custo dos produtos vendidos</span>
                    <span>{money(d.cogs)}</span>
                  </div>
                  <div className="m">
                    <span>− Despesas</span>
                    <span>{money(d.expenseTotal)}</span>
                  </div>
                  <div className="t">
                    <span>= {d.net < 0 ? "Prejuízo" : "Lucro líquido"}</span>
                    <span className={d.net >= 0 ? "fn-ok" : "fn-bad"}>{money(d.net)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pn-card fn-box">
            <h3>A receber</h3>
            <p className="fn-d">Atendimentos do período que ainda não foram marcados como pagos</p>
            <p className="fn-receber">
              <b className={d.pendingCents ? "fn-bad" : ""}>{money(d.pendingCents)}</b> em {d.pendingCount} atendimento{d.pendingCount === 1 ? "" : "s"}
              {d.pendingCount > 0 && (
                <Link href={`/painel/agendamentos?pagamento=receber&periodo=${r.period === "semana" || r.period === "hoje" || r.period === "anterior" ? r.period : "mes"}`} className="fn-link">
                  marcar em Agendamentos <ArrowRight />
                </Link>
              )}
            </p>
          </div>
        </>
      )}

      {tab === "equipe" && (
        <>
          <div className="pn-card fn-box">
            <h3>Desempenho por profissional</h3>
            <p className="fn-d">
              Comissão pela regra de cada um (em <Link href="/painel/profissionais" className="fn-link">Gestão de equipe</Link>). Salário é proporcional ao período.
            </p>
            {d.team.length === 0 ? (
              <p className="am-empty">Nenhum profissional cadastrado.</p>
            ) : (
              <div className="fn-tw">
                <table>
                  <thead>
                    <tr>
                      <th>Profissional</th>
                      <th>Regra</th>
                      <th className="num">Atend.</th>
                      <th className="num">Serviços</th>
                      <th className="num">Produtos</th>
                      <th className="num">Comissão a pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.team.map((t) => (
                      <tr key={t.id} data-testid="fn-team-row">
                        <td>
                          <b>{t.name}</b>
                        </td>
                        <td className="am-muted">{t.rule}</td>
                        <td className="num">{t.services}</td>
                        <td className="num">{money(t.serviceCents)}</td>
                        <td className="num">{money(t.productCents)}</td>
                        <td className="num fn-ok">
                          <b>{money(t.commission)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="fn-grid2 even">
            <div className="pn-card fn-box">
              <h3>Serviços mais vendidos</h3>
              {d.byService.length === 0 ? (
                <p className="am-empty">Nenhum atendimento pago no período.</p>
              ) : (
                <div className="fn-tw">
                  <table>
                    <thead>
                      <tr>
                        <th>Serviço</th>
                        <th className="num">Qtd.</th>
                        <th className="num">Faturou</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.byService.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td className="num">{s.n}</td>
                          <td className="num">{money(s.cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="pn-card fn-box">
              <h3>Produtos mais vendidos</h3>
              {d.byProduct.length === 0 ? (
                <p className="am-empty">Nenhum produto vendido no período.</p>
              ) : (
                <div className="fn-tw">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th className="num">Qtd.</th>
                        <th className="num">Faturou</th>
                        <th className="num">Lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.byProduct.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td className="num">{s.n}</td>
                          <td className="num">{money(s.cents)}</td>
                          <td className="num fn-ok">{s.hasCost ? money(s.cents - s.cost) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "pagamentos" && (
        <div className="fn-grid2">
          <div className="pn-card fn-box">
            <h3>Recebido por forma de pagamento</h3>
            <p className="fn-d">Bruto, taxa da maquininha e o que cai na conta</p>
            {d.methods.length === 0 ? (
              <p className="am-empty">Nenhum pagamento no período.</p>
            ) : (
              <div className="fn-tw">
                <table>
                  <thead>
                    <tr>
                      <th>Forma</th>
                      <th className="num">Qtd.</th>
                      <th className="num">Bruto</th>
                      <th className="num">Taxa</th>
                      <th className="num">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.methods.map((m) => (
                      <tr key={m.key} data-testid="fn-method-row">
                        <td>{m.label}</td>
                        <td className="num">{m.n}</td>
                        <td className="num">{money(m.cents)}</td>
                        <td className="num fn-bad">{m.fee ? `− ${money(m.fee)}` : "—"}</td>
                        <td className="num">
                          <b>{money(m.cents - m.fee)}</b>
                        </td>
                      </tr>
                    ))}
                    <tr className="fn-total">
                      <td>Total</td>
                      <td className="num">{d.methods.reduce((s, m) => s + m.n, 0)}</td>
                      <td className="num">{money(d.gross)}</td>
                      <td className="num fn-bad">− {money(d.fees)}</td>
                      <td className="num">{money(d.gross - d.fees)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="pn-card fn-box">
            <h3>Taxas da maquininha</h3>
            <p className="fn-d">Quanto a maquininha ou o banco cobra em cada forma. Entram no cálculo do lucro.</p>
            <FeesForm fees={{ pix: b.feePixBps, cash: b.feeCashBps, debit: b.feeDebitBps, credit: b.feeCreditBps }} />
            <p className="fn-d" style={{ marginTop: 10 }}>
              O que foi marcado como “Cartão” antes de separar débito e crédito usa a taxa do crédito.
            </p>
          </div>
        </div>
      )}

      {tab === "extrato" && (
        <div className="pn-card am-tbl">
          <div className="fn-box fn-noprint" style={{ paddingBottom: 6 }}>
            <div className="am-chips">
              {EXTRATO.map((x) => (
                <Link key={x.id} href={qs({ f: x.id })} className={`am-chip ${(p.f ?? "") === x.id ? "on" : ""}`}>
                  {x.label}
                </Link>
              ))}
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="am-empty">Nada no período.</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Profissional</th>
                    <th>Forma</th>
                    <th>Situação</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(0, 500).map((l) => (
                    <tr key={l.key} data-testid="fn-line">
                      <td>
                        {dm(l.date)} <small className="am-muted">{l.time}</small>
                      </td>
                      <td className="am-who">
                        <b>{l.title}</b>
                        <small>{l.detail}</small>
                      </td>
                      <td>{l.who}</td>
                      <td>{l.method || "—"}</td>
                      <td>
                        <Status kind={l.kind} />
                      </td>
                      <td className={`num ${l.kind === "DESP" ? "fn-bad" : l.kind === "RECEBER" ? "" : "fn-ok"}`}>
                        <b>
                          {l.kind === "DESP" ? "− " : l.kind === "RECEBER" ? "" : "+ "}
                          {money(Math.abs(l.cents))}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="am-cards">
                {lines.slice(0, 500).map((l) => (
                  <div key={l.key} className="am-card fn-cline">
                    <div className="min-w-0">
                      <b className="am-n">{l.title}</b>
                      <small className="am-s">
                        {dm(l.date)} · {l.detail}
                        {l.who !== "—" ? ` · ${l.who}` : ""}
                        {l.method ? ` · ${l.method}` : ""}
                      </small>
                      <div className="am-pills">
                        <Status kind={l.kind} />
                      </div>
                    </div>
                    <b className={l.kind === "DESP" ? "fn-bad" : l.kind === "RECEBER" ? "" : "fn-ok"}>
                      {l.kind === "DESP" ? "− " : l.kind === "RECEBER" ? "" : "+ "}
                      {money(Math.abs(l.cents))}
                    </b>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="am-foot">
            <span>
              {lines.length} lançamento{lines.length === 1 ? "" : "s"}
              {lines.length > 500 ? " · mostrando 500 (exporte a planilha para ver tudo)" : ""}
            </span>
            <span />
          </div>
        </div>
      )}

      {tab === "despesas" && (
        <div className="fn-grid2">
          <div className="pn-card fn-box">
            <h3>Despesas do período · {money(d.expenseTotal)}</h3>
            <p className="fn-d">Aluguel, contas, material… entram no cálculo do lucro. Fixas repetem todo mês no mesmo dia.</p>
            {d.expenseRows.length === 0 ? (
              <p className="am-empty">Nenhuma despesa no período.</p>
            ) : (
              <div className="fn-tw">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Despesa</th>
                      <th>Categoria</th>
                      <th className="num">Valor</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.expenseRows.map((e) => (
                      <tr key={`${e.id}-${e.on}`} data-testid="fn-exp-row">
                        <td>{dm(e.on)}</td>
                        <td>
                          <b>{e.description}</b>
                          {e.recurring && <small className="am-muted"> · fixa{e.endDate ? ` até ${dm(e.endDate)}` : ""}</small>}
                        </td>
                        <td className="am-muted">{EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category}</td>
                        <td className="num fn-bad">{money(e.amountCents)}</td>
                        <td>
                          {(!e.recurring || !e.endDate) && (
                            <form action={removeExpense}>
                              <input type="hidden" name="id" value={e.id} />
                              <button className="am-ib" title={e.recurring && e.date < today ? "Parar de repetir" : "Apagar"} aria-label={e.recurring && e.date < today ? "Parar de repetir" : "Apagar"}>
                                <Trash2 />
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="pn-card fn-box">
            <h3>Nova despesa</h3>
            <ExpenseForm today={today} />
          </div>
        </div>
      )}
    </div>
  );
}

function Status({ kind }: { kind: "ATEND" | "PROD" | "DESP" | "RECEBER" }) {
  const s = { ATEND: ["Pago", "#16a34a"], PROD: ["Produto", "#14b8a6"], DESP: ["Saída", "#ef4444"], RECEBER: ["A receber", "#f59e0b"] }[kind];
  return (
    <span className="am-pill" style={{ ["--c" as string]: s[1] }}>
      {s[0]}
    </span>
  );
}
