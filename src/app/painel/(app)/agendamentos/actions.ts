"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { isPaymentMethod } from "@/lib/quick-book";
import { fold, parseDate, parseMoney, parsePaid, parseTime } from "@/lib/appointments-list";
import { nowInTimezone } from "@/lib/time";

/** Marca o atendimento como pago (com a forma) ou volta para "a receber". */
export async function setPayment(id: string, method: string | null) {
  const user = await requireActiveUser();
  const paid = method !== null && isPaymentMethod(method);
  await db.appointment.updateMany({
    where: { id, businessId: user.businessId },
    data: paid ? { paymentStatus: "PAID", paymentMethod: method, paidAt: new Date() } : { paymentStatus: "PENDING", paymentMethod: null, paidAt: null },
  });
  revalidatePath("/painel/agendamentos");
  return { ok: true };
}

// ---------- Importar planilha ----------

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_ROWS = 2000;
// Nomes de coluna aceitos (sem acento, minúsculo)
const HEADERS: Record<string, string[]> = {
  data: ["data", "dia"],
  horario: ["horario", "hora", "inicio"],
  cliente: ["cliente", "nome", "nome do cliente"],
  telefone: ["telefone", "celular", "whatsapp", "fone"],
  servico: ["servico", "servicos"],
  profissional: ["profissional", "barbeiro", "atendente"],
  valor: ["valor", "preco", "valor (r$)"],
  pago: ["pago", "pagamento", "forma de pagamento"],
};

type Raw = Record<string, unknown>;

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Lê a planilha (.xlsx ou .csv) e devolve as linhas pelas colunas conhecidas. */
async function readSheet(file: File): Promise<{ rows: { line: number; raw: Raw }[] } | { error: string }> {
  if (file.size === 0) return { error: "Escolha a planilha." };
  if (file.size > MAX_BYTES) return { error: "Planilha muito grande (máximo 3 MB)." };
  let table: unknown[][] = [];
  const isCsv = /\.csv$/i.test(file.name) || file.type.includes("csv") || file.type === "text/plain";
  try {
    if (isCsv) {
      const text = (await file.text()).replace(/^﻿/, "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
      table = lines.map((l) => splitCsvLine(l, sep));
    } else {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) return { error: "A planilha está vazia." };
      ws.eachRow({ includeEmpty: false }, (row) => {
        const vals = (row.values as unknown[]).slice(1).map((v) => {
          if (v && typeof v === "object" && "text" in (v as object)) return (v as { text: string }).text;
          if (v && typeof v === "object" && "result" in (v as object)) return (v as { result: unknown }).result;
          return v;
        });
        table.push(vals);
      });
    }
  } catch {
    return { error: "Não consegui ler esse arquivo. Use a planilha modelo (.xlsx) ou salve como CSV." };
  }
  if (table.length < 2) return { error: "A planilha não tem linhas de agendamento." };
  const head = table[0].map((h) => fold(String(h ?? "")));
  const idx: Record<string, number> = {};
  for (const [key, names] of Object.entries(HEADERS)) {
    const i = head.findIndex((h) => names.includes(h));
    if (i >= 0) idx[key] = i;
  }
  const missing = ["data", "horario", "cliente", "telefone", "servico"].filter((k) => idx[k] === undefined);
  if (missing.length) return { error: `Faltam colunas na planilha: ${missing.join(", ")}. Use a planilha modelo.` };
  const rows = table
    .slice(1)
    .map((r, i) => ({ line: i + 2, raw: Object.fromEntries(Object.entries(idx).map(([k, j]) => [k, r[j]])) }))
    .filter((r) => Object.values(r.raw).some((v) => String(v ?? "").trim() !== ""));
  if (rows.length > MAX_ROWS) return { error: `São no máximo ${MAX_ROWS} agendamentos por vez.` };
  return { rows };
}

type Planned = { line: number; date: string; start: number; end: number; name: string; phone: string; serviceId: string; professionalId: string; priceCents: number; paid: "PIX" | "CASH" | "CARD" | null };
type Plan = { valid: Planned[]; problems: { line: number; msg: string }[]; duplicates: number };

async function planImport(businessId: string, file: File): Promise<Plan | { error: string }> {
  const sheet = await readSheet(file);
  if ("error" in sheet) return sheet;
  const [services, pros] = await Promise.all([
    db.service.findMany({ where: { businessId } }),
    db.professional.findMany({ where: { businessId }, include: { services: true }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);
  const svcByName = new Map(services.map((s) => [fold(s.name), s]));
  const proByName = new Map(pros.map((p) => [fold(p.name), p]));
  const valid: Planned[] = [];
  const problems: Plan["problems"] = [];
  for (const { line, raw } of sheet.rows) {
    const date = parseDate(raw.data);
    const start = parseTime(raw.horario);
    const name = String(raw.cliente ?? "").trim();
    const phone = normalizePhone(String(raw.telefone ?? ""));
    const svc = svcByName.get(fold(String(raw.servico ?? "")));
    const proName = fold(String(raw.profissional ?? ""));
    const pro = proName ? proByName.get(proName) : pros.find((p) => p.active && (!svc || p.services.some((x) => x.serviceId === svc.id)));
    const err = !date
      ? "data inválida"
      : start === null
        ? "horário inválido"
        : name.length < 2
          ? "nome do cliente vazio"
          : phone.length < 12
            ? "telefone vazio ou incompleto"
            : !svc
              ? `serviço “${String(raw.servico ?? "").trim()}” não existe`
              : !pro
                ? proName
                  ? `profissional “${String(raw.profissional ?? "").trim()}” não existe`
                  : "sem profissional para esse serviço"
                : null;
    if (err) {
      problems.push({ line, msg: err });
      continue;
    }
    const price = parseMoney(raw.valor);
    valid.push({
      line,
      date: date!,
      start: start!,
      end: Math.min(24 * 60, start! + svc!.durationMinutes),
      name,
      phone,
      serviceId: svc!.id,
      professionalId: pro!.id,
      priceCents: price ?? svc!.priceCents,
      paid: parsePaid(raw.pago),
    });
  }
  // Não duplica: mesmo profissional, dia, horário e telefone
  const existing = valid.length
    ? await db.appointment.findMany({
        where: { businessId, date: { in: [...new Set(valid.map((v) => v.date))] } },
        select: { professionalId: true, date: true, startMinutes: true, client: { select: { phone: true } } },
      })
    : [];
  const seen = new Set(existing.map((e) => `${e.professionalId}|${e.date}|${e.startMinutes}|${e.client.phone}`));
  let duplicates = 0;
  const fresh = valid.filter((v) => {
    const k = `${v.professionalId}|${v.date}|${v.start}|${v.phone}`;
    if (seen.has(k)) {
      duplicates++;
      return false;
    }
    seen.add(k);
    return true;
  });
  return { valid: fresh, problems, duplicates };
}

export type ImportPreview = { ok: true; count: number; problems: { line: number; msg: string }[]; problemCount: number; duplicates: number } | { ok: false; error: string };

/** Lê a planilha e mostra quantos entram e o que tem problema (não salva nada). */
export async function previewImport(formData: FormData): Promise<ImportPreview> {
  const user = await requireActiveUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Escolha a planilha." };
  const plan = await planImport(user.businessId, file);
  if ("error" in plan) return { ok: false, error: plan.error };
  return { ok: true, count: plan.valid.length, problems: plan.problems.slice(0, 15), problemCount: plan.problems.length, duplicates: plan.duplicates };
}

/** Importa as linhas válidas da planilha. */
export async function runImport(formData: FormData): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await requireActiveUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Escolha a planilha." };
  const plan = await planImport(user.businessId, file);
  if ("error" in plan) return { ok: false, error: plan.error };
  if (!plan.valid.length) return { ok: false, error: "Nenhum agendamento válido para importar." };

  // Clientes pelo telefone (cria quem não existe)
  const phones = [...new Map(plan.valid.map((v) => [v.phone, v.name])).entries()];
  const clientId = new Map<string, string>();
  for (let i = 0; i < phones.length; i += 100) {
    const chunk = phones.slice(i, i + 100);
    const rows = await db.$transaction(
      chunk.map(([phone, name]) =>
        db.client.upsert({ where: { businessId_phone: { businessId: user.businessId, phone } }, update: {}, create: { businessId: user.businessId, name, phone }, select: { id: true, phone: true } }),
      ),
    );
    rows.forEach((r) => clientId.set(r.phone, r.id));
  }
  const today = nowInTimezone().date;
  const now = new Date();
  await db.appointment.createMany({
    data: plan.valid.map((v) => ({
      businessId: user.businessId,
      professionalId: v.professionalId,
      serviceId: v.serviceId,
      clientId: clientId.get(v.phone)!,
      date: v.date,
      startMinutes: v.start,
      endMinutes: v.end,
      priceCents: v.priceCents,
      source: "IMPORT",
      // o que já passou entra como concluído
      status: v.date < today ? "COMPLETED" : "CONFIRMED",
      ...(v.paid ? { paymentStatus: "PAID", paymentMethod: v.paid, paidAt: now } : {}),
    })),
  });
  revalidatePath("/painel", "layout");
  return { ok: true, count: plan.valid.length };
}
