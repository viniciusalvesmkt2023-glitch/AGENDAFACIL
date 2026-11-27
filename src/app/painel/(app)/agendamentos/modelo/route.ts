import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";

/** Planilha modelo para importar agendamentos (com os serviços e profissionais do estabelecimento como exemplo). */
export async function GET() {
  const user = await requireActiveUser();
  const [svc, pro] = await Promise.all([
    db.service.findFirst({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
    db.professional.findFirst({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Agendamentos");
  ws.columns = [
    { header: "data", key: "data", width: 12 },
    { header: "horario", key: "horario", width: 9 },
    { header: "cliente", key: "cliente", width: 26 },
    { header: "telefone", key: "telefone", width: 18 },
    { header: "servico", key: "servico", width: 24 },
    { header: "profissional", key: "profissional", width: 18 },
    { header: "valor", key: "valor", width: 10 },
    { header: "pago", key: "pago", width: 12 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ data: "02/12/2026", horario: "14:30", cliente: "Maria Souza", telefone: "(11) 98765-4321", servico: svc?.name ?? "Corte", profissional: pro?.name ?? "", valor: svc ? svc.priceCents / 100 : 45, pago: "pix" });
  ws.addRow({ data: "03/12/2026", horario: "09:00", cliente: "João Lima", telefone: "(11) 91234-5678", servico: svc?.name ?? "Corte", profissional: "", valor: "", pago: "" });
  const help = wb.addWorksheet("Como preencher");
  [
    ["data", "Dia do atendimento, ex.: 02/12/2026"],
    ["horario", "Hora de início, ex.: 14:30"],
    ["cliente", "Nome do cliente"],
    ["telefone", "Com DDD, ex.: (11) 98765-4321"],
    ["servico", "Igual ao nome cadastrado em Serviços"],
    ["profissional", "Opcional. Vazio = o primeiro profissional que faz o serviço"],
    ["valor", "Opcional. Vazio = o preço do serviço"],
    ["pago", "Opcional: pix, dinheiro ou cartão. Vazio = a receber"],
  ].forEach((r) => help.addRow(r));
  help.getColumn(1).width = 14;
  help.getColumn(2).width = 60;
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-agendamentos.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
