"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { nowInTimezone } from "@/lib/time";
import { clientCanChange } from "@/lib/policy";
import { BookingError, rescheduleAppointment } from "@/lib/booking";
import { sendAppointmentMessage } from "@/lib/notifications";
import { hasAccess } from "@/lib/subscription";

export async function cancelByClient(formData: FormData) {
  const token = String(formData.get("token"));
  const appointment = await db.appointment.findUnique({ where: { cancelToken: token }, include: { business: true } });
  if (!appointment) return;
  // Respeita o prazo definido pelo estabelecimento (e não cancela horários que já passaram)
  if (!clientCanChange(appointment.business, appointment, nowInTimezone()).allowed) return;

  await db.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELED" } });
  revalidatePath(`/agendamento/${token}`);
}

export async function rescheduleByClient(_: { error?: string | null } | undefined, formData: FormData) {
  const token = String(formData.get("token"));
  const appointment = await db.appointment.findUnique({ where: { cancelToken: token }, include: { business: true } });
  if (!appointment) return { error: "Agendamento não encontrado." };
  const b = appointment.business;
  if (!b.clientCanReschedule || !hasAccess(b)) return { error: "Este estabelecimento não permite remarcar pelo link." };
  const check = clientCanChange(b, appointment, nowInTimezone());
  if (!check.allowed) return { error: check.reason };

  const date = String(formData.get("date") ?? "");
  const time = Number(formData.get("time"));
  if (!date || !Number.isFinite(time) || formData.get("time") === "") return { error: "Escolha o novo dia e horário." };
  try {
    await rescheduleAppointment({ business: b, appointmentId: appointment.id, date, startMinutes: time, enforceWindow: true });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  // Confirmação da nova data no WhatsApp (se o estabelecimento usa)
  after(() => sendAppointmentMessage(appointment.id, "CONFIRMATION"));
  revalidatePath(`/agendamento/${token}`);
  redirect(`/agendamento/${token}?remarcado=1`);
}
