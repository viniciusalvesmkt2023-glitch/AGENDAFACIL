"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { BookingError, createAppointment } from "@/lib/booking";

export type BookingState = { error?: string | null } | undefined;

const schema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1, "Escolha um serviço."),
  professionalId: z.string().optional(),
  date: z.string().min(1, "Escolha uma data."),
  time: z.coerce.number().int().min(0, "Escolha um horário."),
  clientName: z.string().trim().min(2, "Informe seu nome."),
  clientPhone: z.string().trim().min(10, "Informe seu WhatsApp com DDD."),
  notes: z.string().trim().max(500).optional(),
});

export async function bookOnline(_: BookingState, formData: FormData): Promise<BookingState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const business = await db.business.findUnique({ where: { slug: d.slug } });
  if (!business) return { error: "Estabelecimento não encontrado." };

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
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  redirect(`/agendamento/${token}?novo=1`);
}
