"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { isValidDate, nowInTimezone, weekdayOf } from "@/lib/time";
import { blockIntervals, effectiveHours } from "@/lib/schedule";
import { sendAppointmentMessage } from "@/lib/notifications";
import { syncLoyaltyStamp } from "@/lib/loyalty-sync";
import { countConflicts, isPaymentMethod, planSlots } from "@/lib/quick-book";

/** Dados da janela de agendamento rápido (carregados ao abrir). */
export async function loadQuickBook() {
  const user = await requireActiveUser();
  const b = user.business;
  const [pros, services] = await Promise.all([
    db.professional.findMany({
      where: { businessId: b.id, active: true },
      include: { services: { select: { serviceId: true } } },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({ where: { businessId: b.id, active: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    today: nowInTimezone().date,
    now: nowInTimezone().minutes,
    canWhatsapp: b.whatsappStatus === "CONNECTED" && b.whatsappRemindersEnabled && b.confirmationEnabled,
    professionals: pros.map((p) => ({ id: p.id, name: p.name, serviceIds: p.services.map((s) => s.serviceId) })),
    services: services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents })),
  };
}

/** Busca de clientes por nome ou telefone (até 6). */
export async function searchClients(q: string) {
  const user = await requireActiveUser();
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const digits = term.replace(/\D/g, "");
  const rows = await db.client.findMany({
    where: {
      businessId: user.businessId,
      OR: [{ name: { contains: term, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])],
    },
    orderBy: { name: "asc" },
    take: 6,
  });
  return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
}

/** O que já ocupa o dia do profissional (para avisar de encaixe) e o horário dele. */
export async function dayBusy(professionalId: string, date: string) {
  const user = await requireActiveUser();
  if (!isValidDate(date)) return null;
  const pro = await db.professional.findFirst({ where: { id: professionalId, businessId: user.businessId }, include: { hours: true } });
  if (!pro) return null;
  const wd = weekdayOf(date);
  const [hours, appts, blocks] = await Promise.all([
    db.workingHour.findMany({ where: { businessId: user.businessId } }),
    db.appointment.findMany({ where: { professionalId, date, status: { notIn: ["CANCELED", "NO_SHOW"] } }, select: { startMinutes: true, endMinutes: true } }),
    db.timeBlock.findMany({ where: { businessId: user.businessId, date: { lte: date }, OR: [{ endDate: null }, { endDate: { gte: date } }] } }),
  ]);
  const h = effectiveHours(pro, hours, wd);
  return {
    hours: h && h.isOpen ? { start: h.startMinutes, end: h.endMinutes, breakStart: h.breakStart ?? null, breakEnd: h.breakEnd ?? null } : null,
    busy: [
      ...appts.map((a) => ({ start: a.startMinutes, end: a.endMinutes })),
      ...blockIntervals(blocks, date, wd, professionalId).map((x) => ({ start: x.startMinutes, end: x.endMinutes })),
    ],
  };
}

const input = z.object({
  professionalId: z.string().min(1, "Escolha o profissional."),
  clientId: z.string().optional(),
  newClient: z.object({ name: z.string().trim(), phone: z.string().trim() }).optional(),
  items: z
    .array(z.object({ serviceId: z.string().min(1, "Escolha o serviço."), priceCents: z.number().int().min(0).max(10_000_000), payment: z.string() }))
    .min(1, "Escolha pelo menos um serviço.")
    .max(6),
  date: z.string(),
  time: z.number().int().min(0).max(24 * 60 - 1),
  notes: z.string().trim().max(500).optional(),
  repeat: z.object({ everyWeeks: z.number().int().min(1).max(8), times: z.number().int().min(2).max(52) }).optional(),
  sendWhatsapp: z.boolean().optional(),
});
export type QuickBookInput = z.infer<typeof input>;
export type QuickBookResult = { ok: true; count: number; date: string; conflicts: number } | { ok: false; error: string };

/**
 * Agendamento rápido do dono/secretária: vários serviços em sequência, encaixe permitido
 * (avisado na tela), repetição semanal, pagamento e confirmação no WhatsApp.
 */
export async function quickBook(raw: QuickBookInput): Promise<QuickBookResult> {
  const user = await requireActiveUser();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!isValidDate(d.date)) return { ok: false, error: "Escolha a data." };

  const pro = await db.professional.findFirst({ where: { id: d.professionalId, businessId: user.businessId, active: true } });
  if (!pro) return { ok: false, error: "Profissional não encontrado." };
  const services = await db.service.findMany({ where: { businessId: user.businessId, id: { in: d.items.map((i) => i.serviceId) } } });
  const byId = new Map(services.map((s) => [s.id, s]));
  if (d.items.some((i) => !byId.has(i.serviceId))) return { ok: false, error: "Serviço não encontrado." };

  // Cliente: um já cadastrado ou um novo (pelo telefone, sem duplicar)
  let clientId = d.clientId ?? null;
  if (clientId) {
    const c = await db.client.findFirst({ where: { id: clientId, businessId: user.businessId } });
    if (!c) return { ok: false, error: "Cliente não encontrado." };
  } else {
    const name = d.newClient?.name ?? "";
    const phone = normalizePhone(d.newClient?.phone ?? "");
    if (name.length < 2) return { ok: false, error: "Informe o nome do cliente." };
    if (phone.length < 12) return { ok: false, error: "Informe o telefone do cliente com DDD." };
    const c = await db.client.upsert({
      where: { businessId_phone: { businessId: user.businessId, phone } },
      update: { name },
      create: { businessId: user.businessId, name, phone },
    });
    clientId = c.id;
  }

  const slots = planSlots(
    d.date,
    d.time,
    d.items.map((i) => byId.get(i.serviceId)!.durationMinutes),
    d.repeat,
  );
  if (slots.some((s) => s.end > 24 * 60)) return { ok: false, error: "Os serviços passam da meia-noite. Escolha um horário mais cedo." };
  const existing = await db.appointment.findMany({
    where: { professionalId: pro.id, date: { in: [...new Set(slots.map((s) => s.date))] }, status: { notIn: ["CANCELED", "NO_SHOW"] } },
    select: { date: true, startMinutes: true, endMinutes: true },
  });
  const conflicts = countConflicts(slots, existing.map((e) => ({ date: e.date, start: e.startMinutes, end: e.endMinutes })));

  const now = new Date();
  const created = await db.$transaction(
    slots.map((s) => {
      const item = d.items[s.item];
      const paid = isPaymentMethod(item.payment);
      return db.appointment.create({
        data: {
          businessId: user.businessId,
          professionalId: pro.id,
          serviceId: item.serviceId,
          clientId: clientId!,
          date: s.date,
          startMinutes: s.start,
          endMinutes: s.end,
          priceCents: item.priceCents,
          notes: d.notes || null,
          source: "MANUAL",
          status: "CONFIRMED",
          // pagamento marcado na hora vale só para o primeiro dia (os repetidos ficam a receber)
          ...(paid && s.date === d.date ? { paymentStatus: "PAID", paymentMethod: item.payment, paidAt: now } : {}),
        },
        select: { id: true },
      });
    }),
  );
  if (d.sendWhatsapp && created[0]) after(() => sendAppointmentMessage(created[0].id, "CONFIRMATION"));
  // pago na hora (e já aconteceu) conta selo no cartão fidelidade
  for (const c of created) await syncLoyaltyStamp(c.id);
  revalidatePath("/painel", "layout");
  return { ok: true, count: created.length, date: d.date, conflicts };
}
