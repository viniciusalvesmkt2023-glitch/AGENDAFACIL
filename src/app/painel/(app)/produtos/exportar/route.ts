import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { STOCK_LABEL, stockState } from "@/lib/products";

/** Exporta o catálogo de produtos com o estoque para o Excel. */
export async function GET() {
  const user = await requireActiveUser();
  const products = await db.product.findMany({ where: { businessId: user.businessId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Produtos");
  ws.columns = [
    { header: "Produto", key: "nome", width: 30 },
    { header: "Código", key: "codigo", width: 18 },
    { header: "Preço (R$)", key: "preco", width: 12 },
    { header: "Custo (R$)", key: "custo", width: 12 },
    { header: "Estoque", key: "estoque", width: 10 },
    { header: "Avisar com", key: "minimo", width: 11 },
    { header: "Situação", key: "situacao", width: 14 },
    { header: "Disponível", key: "ativo", width: 11 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const p of products) {
    ws.addRow({
      nome: p.name,
      codigo: p.code ?? "",
      preco: p.priceCents / 100,
      custo: p.costCents != null ? p.costCents / 100 : "",
      estoque: p.stock,
      minimo: p.minStock ?? "",
      situacao: STOCK_LABEL[stockState(p.stock, p.minStock)].label,
      ativo: p.active ? "Sim" : "Não",
    });
  }
  ws.getColumn("preco").numFmt = '"R$" #,##0.00';
  ws.getColumn("custo").numFmt = '"R$" #,##0.00';
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="produtos.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
