"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { addDays, isValidDate, timeToMinutes, todayInTimezone, weekdayOf } from "@/lib/time";
import { blockAppliesOn } from "@/lib/schedule";

export type BlockState = { error?: string | null; success?: string | null; warning?: string | null } | undefined;

export async function createBlock(_: BlockState, formData: FormData): Promise<BlockState> {
  const user = await requireActiveUser();
  const today = todayInTimezone();
  const kind = formData.get("kind") === "WEEKLY" ? "WEEKLY" : "ONCE";
  const proId = String(formData.get("professionalId") ?? "");
  if (proId && !(await db.professional.findFirst({ where: { id: proId, businessId: user.businessId } }))) {
    return { error: "Profissional não encontrado." };
  }
  const allDay = formData.get("allDay") === "on";
  const start = timeToMinutes(String(formData.get("start") ?? ""));
  const end = timeToMinutes(String(formData.get("end") ?? ""));
  if (!allDay && (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)) {
    return { error: "O horário final precisa ser depois do inicial." };
  }
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 80) || null;
  const date = String(formData.get("date") ?? "") || today;
  const endDate = String(formData.get("endDate") ?? "") || null;
  if (!isValidDate(date) || (endDate && !isValidDate(endDate))) return { error: "Data inválida." };
  if (endDate && endDate < date) return { error: "A data final precisa ser depois da inicial." };

  const base = {
    businessId: user.businessId,
    professionalId: proId || null,
    startMinutes: allDay ? null : start,
    endMinutes: allDay ? null : end,
    reason,
  };
  let rows;
  if (kind === "WEEKLY") {
    const weekdays = [...new Set(formData.getAll("weekdays").map(Number).filter((d) => d >= 0 && d <= 6))];
    if (!weekdays.length) return { error: "Escolha pelo menos um dia da semana." };
    rows = weekdays.map((weekday) => ({ ...base, kind, date, endDate, weekday }));
  } else {
    if (date < today) return { error: "Escolha uma data de hoje em diante." };
    if (endDate && addDays(date, 366) < endDate) return { error: "O período pode ter no máximo 1 ano." };
    rows = [{ ...base, kind, date, endDate: endDate && endDate !== date ? endDate : null, weekday: null }];
  }
  await db.timeBlock.createMany({ data: rows });

  // Avisa se já existem clientes marcados no período bloqueado (eles continuam na agenda)
  const until = rows[0].endDate ?? (kind === "WEEKLY" ? addDays(date, 90) : date);
  const appts = await db.appointment.findMany({
    where: {
      businessId: user.businessId,
      date: { gte: date, lte: until },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      ...(proId ? { professionalId: proId } : {}),
    },
    select: { date: true, startMinutes: true, endMinutes: true },
  });
  const hits = appts.filter((a) =>
    rows.some(
      (r) =>
        blockAppliesOn({ ...r, professionalId: r.professionalId }, a.date, weekdayOf(a.date)) &&
        (r.startMinutes === null || r.endMinutes === null || (a.startMinutes < r.endMinutes && r.startMinutes < a.endMinutes)),
    ),
  ).length;

  revalidatePath("/painel/bloqueios");
  revalidatePath("/painel");
  return {
    success: "Bloqueio criado. Esses horários não aparecem mais para os clientes.",
    warning: hits ? `Atenção: ${hits} cliente${hits === 1 ? " já estava marcado" : "s já estavam marcados"} nesse período. Eles continuam na agenda: avise e remarque se precisar.` : null,
  };
}

export async function deleteBlock(formData: FormData) {
  const user = await requireActiveUser();
  await db.timeBlock.deleteMany({ where: { id: String(formData.get("id")), businessId: user.businessId } });
  revalidatePath("/painel/bloqueios");
  revalidatePath("/painel");
}
