"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendAppointmentMessage } from "@/lib/notifications";
import { z } from "zod";
import { db } from "@/lib/db";
import { BookingError, createAppointment } from "@/lib/booking";
import { hasAccess } from "@/lib/subscription";

export type BookingState = { error?: string | null; values?: { clientName?: string; clientPhone?: string; notes?: string } } | undefined;

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1, "Escolha um serviço."),
  professionalId: z.string().optional(),
  date: z.string().min(1, "Escolha uma data."),
  time: z.coerce.number().int().min(0, "Escolha um horário."),
  clientName: z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo."),
  clientPhone: z.string().trim().min(10, "Informe seu WhatsApp com DDD.").max(30),
  notes: z.string().trim().max(500).optional(),
});

export async function bookOnline(_: BookingState, formData: FormData): Promise<BookingState> {
  const values = {
    clientName: String(formData.get("clientName") ?? ""),
    clientPhone: String(formData.get("clientPhone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const fail = (error: string): BookingState => ({ error, values });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const business = await db.business.findUnique({ where: { slug: d.slug } });
  if (!business) return fail("Estabelecimento não encontrado.");
  if (!hasAccess(business)) return fail("O agendamento online está indisponível no momento.");

  let token: string;
  try {
    const appointment = await createAppointment({
      business,
      serviceId: d.serviceId,
      professionalId: d.professionalId || null,
      date: d.date,
      startMinutes: d.time,
      clientName: d.clientName,
      clientPhone: d.clientPhone,
      notes: d.notes,
      source: "ONLINE",
    });
    token = appointment.cancelToken;
    // Confirmação no WhatsApp enviada em segundo plano, sem atrasar a resposta ao cliente
    after(() => sendAppointmentMessage(appointment.id, "CONFIRMATION"));
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message);
    throw e;
  }
  redirect(`/agendamento/${token}?novo=1`);
}
