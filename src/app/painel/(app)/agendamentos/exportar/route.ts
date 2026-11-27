import ExcelJS from "exceljs";
import { requireActiveUser } from "@/lib/auth";
import { nowInTimezone, minutesToTime } from "@/lib/time";
import { formatPhone } from "@/lib/format";
import { methodLabel } from "@/lib/quick-book";
import { listAppointments, readFilters } from "../query";

const STATUS: Record<string, string> = { SCHEDULED: "Agendado", CONFIRMED: "Confirmado", COMPLETED: "Concluído", NO_SHOW: "Faltou", CANCELED: "Cancelado" };

/** Exporta os agendamentos (com os filtros da tela) para uma planilha do Excel. */
export async function GET(req: Request) {
  const user = await requireActiveUser();
  const p = Object.fromEntries(new URL(req.url).searchParams);
  const f = readFilters(p, nowInTimezone().date);
  const rows = await listAppointments(user.businessId, f);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Agendamentos");
  ws.columns = [
    { header: "Data", key: "data", width: 12 },
    { header: "Horário", key: "inicio", width: 9 },
    { header: "Até", key: "fim", width: 9 },
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Serviço", key: "servico", width: 24 },
    { header: "Profissional", key: "profissional", width: 18 },
    { header: "Situação", key: "situacao", width: 13 },
    { header: "Pagamento", key: "pagamento", width: 16 },
    { header: "Valor (R$)", key: "valor", width: 12 },
    { header: "Observações", key: "obs", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const a of rows) {
    ws.addRow({
      data: `${a.date.slice(8)}/${a.date.slice(5, 7)}/${a.date.slice(0, 4)}`,
      inicio: minutesToTime(a.startMinutes),
      fim: minutesToTime(a.endMinutes),
      cliente: a.client.name,
      telefone: formatPhone(a.client.phone),
      servico: a.service.name,
      profissional: a.professional.name,
      situacao: STATUS[a.status] ?? a.status,
      pagamento: a.paymentStatus === "PAID" ? `Pago${a.paymentMethod ? ` · ${methodLabel(a.paymentMethod)}` : ""}` : a.status === "CANCELED" || a.status === "NO_SHOW" ? "—" : "A receber",
      valor: a.priceCents / 100,
      obs: a.notes ?? "",
    });
  }
  ws.getColumn("valor").numFmt = '"R$" #,##0.00';
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="agendamentos-${f.range.from}-a-${f.range.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
