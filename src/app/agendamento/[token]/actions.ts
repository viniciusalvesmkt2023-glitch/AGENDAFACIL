"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { nowInTimezone } from "@/lib/time";

export async function cancelByClient(formData: FormData) {
  const token = String(formData.get("token"));
  const appointment = await db.appointment.findUnique({ where: { cancelToken: token } });
  if (!appointment || !["SCHEDULED", "CONFIRMED"].includes(appointment.status)) return;

  // Não permite cancelar horários que já passaram
  const now = nowInTimezone();
  const isPast = appointment.date < now.date || (appointment.date === now.date && appointment.startMinutes <= now.minutes);
  if (isPast) return;

  await db.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELED" } });
  revalidatePath(`/agendamento/${token}`);
}
