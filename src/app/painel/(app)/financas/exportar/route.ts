import ExcelJS from "exceljs";
import { requireActiveUser } from "@/lib/auth";
import { nowInTimezone } from "@/lib/time";
import { loadFinance, readRange } from "../data";

/** Exporta Finanças do período: resumo, equipe e extrato. */
export async function GET(req: Request) {
  const user = await requireActiveUser();
  const r = readRange(Object.fromEntries(new URL(req.url).searchParams), nowInTimezone().date);
  const d = await loadFinance(user.business, r.from, r.to);
  const wb = new ExcelJS.Workbook();
  const brl = '"R$" #,##0.00';

  const res = wb.addWorksheet("Resumo");
  res.columns = [{ width: 34 }, { width: 16 }];
  res.addRow([`Finanças de ${r.from.split("-").reverse().join("/")} a ${r.to.split("-").reverse().join("/")}`]).font = { bold: true };
  res.addRow([]);
  [
    ["Faturamento bruto", d.gross],
    ["  Atendimentos", d.apptGross],
    ["  Produtos", d.salesGross],
    ["(−) Taxas de pagamento", -d.fees],
    ["(−) Comissões", -d.commissions],
    ["(−) Custo dos produtos vendidos", -d.cogs],
    ["(−) Despesas", -d.expenseTotal],
    ["= Lucro líquido", d.net],
    ["A receber (não pago)", d.pendingCents],
  ].forEach(([k, v]) => {
    const row = res.addRow([k, (v as number) / 100]);
    row.getCell(2).numFmt = brl;
    if (String(k).startsWith("=")) row.font = { bold: true };
  });

  const eq = wb.addWorksheet("Equipe");
  eq.columns = [
    { header: "Profissional", key: "n", width: 22 },
    { header: "Regra", key: "r", width: 30 },
    { header: "Atendimentos", key: "a", width: 13 },
    { header: "Serviços (R$)", key: "s", width: 14 },
    { header: "Produtos (R$)", key: "p", width: 14 },
    { header: "Comissão (R$)", key: "c", width: 14 },
  ];
  eq.getRow(1).font = { bold: true };
  d.team.forEach((t) => eq.addRow({ n: t.name, r: t.rule, a: t.services, s: t.serviceCents / 100, p: t.productCents / 100, c: t.commission / 100 }));
  ["s", "p", "c"].forEach((k) => (eq.getColumn(k).numFmt = brl));

  const ex = wb.addWorksheet("Extrato");
  ex.columns = [
    { header: "Data", key: "d", width: 12 },
    { header: "Hora", key: "h", width: 8 },
    { header: "Tipo", key: "t", width: 12 },
    { header: "Descrição", key: "x", width: 28 },
    { header: "Detalhe", key: "y", width: 26 },
    { header: "Profissional", key: "p", width: 18 },
    { header: "Forma", key: "f", width: 12 },
    { header: "Valor (R$)", key: "v", width: 13 },
  ];
  ex.getRow(1).font = { bold: true };
  const T = { ATEND: "Atendimento", PROD: "Produto", DESP: "Despesa", RECEBER: "A receber" };
  d.lines.forEach((l) => ex.addRow({ d: l.date.split("-").reverse().join("/"), h: l.time, t: T[l.kind], x: l.title, y: l.detail, p: l.who, f: l.method, v: l.cents / 100 }));
  ex.getColumn("v").numFmt = brl;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="financas-${r.from}-a-${r.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
