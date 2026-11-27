"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { parseMoney } from "@/lib/appointments-list";
import { isValidDate, nowInTimezone } from "@/lib/time";

export type FinState = { error?: string; success?: string } | undefined;

const pct = (v: FormDataEntryValue | null) => {
  const raw = String(v ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 100) : NaN;
};

/** Taxas da maquininha/banco por forma de pagamento. */
export async function saveFees(_: FinState, formData: FormData): Promise<FinState> {
  const user = await requireActiveUser();
  const data = { feePixBps: pct(formData.get("pix")), feeCashBps: pct(formData.get("cash")), feeDebitBps: pct(formData.get("debit")), feeCreditBps: pct(formData.get("credit")) };
  if (Object.values(data).some((v) => Number.isNaN(v))) return { error: "Use taxas de 0 a 30%, ex.: 3,49." };
  await db.business.update({ where: { id: user.businessId }, data });
  revalidatePath("/painel/financas");
  return { success: "Taxas salvas." };
}

const CATS = ["ALUGUEL", "CONTAS", "MATERIAL", "MARKETING", "PESSOAL", "OUTROS"];

export async function addExpense(_: FinState, formData: FormData): Promise<FinState> {
  const user = await requireActiveUser();
  const description = String(formData.get("description") ?? "").trim().slice(0, 80);
  if (description.length < 2) return { error: "Descreva a despesa (ex.: Conta de luz)." };
  const amount = parseMoney(formData.get("amount"));
  if (!amount) return { error: "Informe o valor." };
  const date = String(formData.get("date") ?? "");
  if (!isValidDate(date)) return { error: "Escolha a data." };
  const category = String(formData.get("category") ?? "OUTROS");
  await db.expense.create({
    data: { businessId: user.businessId, description, amountCents: amount, date, category: CATS.includes(category) ? category : "OUTROS", recurring: formData.get("recurring") === "on" },
  });
  revalidatePath("/painel/financas");
  return { success: "Despesa salva." };
}

/** Apaga a despesa (fixa: para de repetir a partir de hoje, mantendo os meses que já passaram). */
export async function removeExpense(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "");
  const e = await db.expense.findFirst({ where: { id, businessId: user.businessId } });
  if (!e) return;
  const today = nowInTimezone().date;
  if (e.recurring && e.date < today) await db.expense.update({ where: { id }, data: { endDate: today } });
  else await db.expense.delete({ where: { id } });
  revalidatePath("/painel/financas");
}
