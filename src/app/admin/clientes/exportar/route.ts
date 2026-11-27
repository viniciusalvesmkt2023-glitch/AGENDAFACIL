import { requireAdmin } from "@/lib/admin";
import { isFilter, listClients } from "@/lib/admin-clients";
import { STATUS_LABEL } from "@/lib/admin-stats";
import { PLANS, isPlanId } from "@/lib/plans";

/** Planilha (CSV, abre no Excel/Google Planilhas) com os clientes do filtro atual. */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const f = url.searchParams.get("f");
  const { rows } = await listClients({ filter: isFilter(f) ? f : "TODOS", q: url.searchParams.get("q") ?? "" });
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Estabelecimento", "Link", "Dono", "E-mail", "Telefone", "Plano", "Situação", "Cliente desde", "Agendamentos (30 dias)", "Total pago (R$)", "WhatsApp"];
  const lines = rows.map((c) =>
    [c.name, `horaboa.com/${c.slug}`, c.owner, c.email, c.phone ?? "", isPlanId(c.plan) ? PLANS[c.plan].name : "", STATUS_LABEL[c.status],
      c.createdAt.toISOString().slice(0, 10), c.appts30, (c.paidCents / 100).toFixed(2).replace(".", ","), c.whatsapp ? "Conectado" : "Desligado"].map(cell).join(";"),
  );
  const csv = "﻿" + [head.map(cell).join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clientes-horaboa-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
