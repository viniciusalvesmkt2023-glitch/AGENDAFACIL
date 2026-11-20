"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BookingError, createAppointment } from "@/lib/booking";
import { parseMoneyToCents, slugify } from "@/lib/format";
import { timeToMinutes } from "@/lib/time";

export type ActionState = { error?: string | null; success?: string | null } | undefined;

const RESERVED_SLUGS = new Set(["entrar", "cadastro", "painel", "api", "agendamento", "sair", "admin"]);
const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"] as const;

// ---------- Agendamentos ----------

export async function updateAppointmentStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const status = z.enum(STATUSES).parse(formData.get("status"));
  const appointment = await db.appointment.findFirst({ where: { id, businessId: user.businessId } });
  if (!appointment) return;

  // Ao reabrir um cancelado/falta, garante que o horário não foi ocupado por outro cliente
  const reactivating = ["CANCELED", "NO_SHOW"].includes(appointment.status) && status !== "CANCELED" && status !== "NO_SHOW";
  if (reactivating) {
    const conflict = await db.appointment.findFirst({
      where: {
        id: { not: id },
        professionalId: appointment.professionalId,
        date: appointment.date,
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
        startMinutes: { lt: appointment.endMinutes },
        endMinutes: { gt: appointment.startMinutes },
      },
    });
    if (conflict) redirect(`/painel?data=${appointment.date}&erro=conflito`);
  }

  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/painel");
}

export async function createManualAppointment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const schema = z.object({
    serviceId: z.string().min(1, "Escolha o serviço."),
    professionalId: z.string().optional(),
    date: z.string().min(1, "Escolha a data."),
    time: z.string().min(1, "Escolha o horário."),
    clientName: z.string().trim().min(2, "Informe o nome do cliente."),
    clientPhone: z.string().trim().min(8, "Informe o telefone do cliente."),
    notes: z.string().trim().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  try {
    await createAppointment({
      business: user.business,
      serviceId: d.serviceId,
      professionalId: d.professionalId || null,
      date: d.date,
      startMinutes: Number(d.time),
      clientName: d.clientName,
      clientPhone: d.clientPhone,
      notes: d.notes,
      source: "MANUAL",
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath("/painel");
  redirect(`/painel?data=${d.date}`);
}

// ---------- Serviços ----------

export async function saveService(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Informe o nome do serviço."),
    description: z.string().trim().optional(),
    durationMinutes: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(600),
    price: z.string().min(1, "Informe o preço."),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, description, durationMinutes, price } = parsed.data;
  const priceCents = parseMoneyToCents(price);
  if (!Number.isFinite(priceCents) || priceCents < 0) return { error: "Preço inválido." };

  if (id) {
    await db.service.updateMany({
      where: { id, businessId: user.businessId },
      data: { name, description: description || null, durationMinutes, priceCents },
    });
  } else {
    const service = await db.service.create({
      data: { businessId: user.businessId, name, description: description || null, durationMinutes, priceCents },
    });
    // Por padrão, todos os profissionais ativos realizam o novo serviço
    const pros = await db.professional.findMany({ where: { businessId: user.businessId, active: true } });
    if (pros.length) {
      await db.professionalService.createMany({
        data: pros.map((p) => ({ professionalId: p.id, serviceId: service.id })),
      });
    }
  }
  revalidatePath("/painel/servicos");
  return { success: id ? "Serviço atualizado." : "Serviço criado." };
}

export async function toggleService(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const service = await db.service.findFirst({ where: { id, businessId: user.businessId } });
  if (service) await db.service.update({ where: { id }, data: { active: !service.active } });
  revalidatePath("/painel/servicos");
}

// ---------- Profissionais ----------

export async function saveProfessional(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Informe o nome do profissional."),
    phone: z.string().trim().optional(),
  });
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, phone } = parsed.data;

  const requested = formData.getAll("serviceIds").map(String);
  const validServices = await db.service.findMany({
    where: { businessId: user.businessId, id: { in: requested } },
    select: { id: true },
  });
  const serviceIds = validServices.map((s) => s.id);

  if (id) {
    const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId } });
    if (!pro) return { error: "Profissional não encontrado." };
    await db.$transaction([
      db.professional.update({ where: { id }, data: { name, phone: phone || null } }),
      db.professionalService.deleteMany({ where: { professionalId: id } }),
      db.professionalService.createMany({ data: serviceIds.map((serviceId) => ({ professionalId: id, serviceId })) }),
    ]);
  } else {
    await db.professional.create({
      data: {
        businessId: user.businessId,
        name,
        phone: phone || null,
        services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
  }
  revalidatePath("/painel/profissionais");
  return { success: id ? "Profissional atualizado." : "Profissional cadastrado." };
}

export async function toggleProfessional(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId } });
  if (pro) await db.professional.update({ where: { id }, data: { active: !pro.active } });
  revalidatePath("/painel/profissionais");
}

// ---------- Horários de funcionamento ----------

export async function saveWorkingHours(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const updates = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const isOpen = formData.get(`open_${weekday}`) === "on";
    const start = timeToMinutes(String(formData.get(`start_${weekday}`) ?? ""));
    const end = timeToMinutes(String(formData.get(`end_${weekday}`) ?? ""));
    const bStartRaw = String(formData.get(`breakStart_${weekday}`) ?? "");
    const bEndRaw = String(formData.get(`breakEnd_${weekday}`) ?? "");
    const breakStart = bStartRaw ? timeToMinutes(bStartRaw) : null;
    const breakEnd = bEndRaw ? timeToMinutes(bEndRaw) : null;

    if (isOpen) {
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return { error: "Verifique os horários de abertura e fechamento." };
      }
      if ((breakStart === null) !== (breakEnd === null)) {
        return { error: "Preencha o início e o fim do intervalo, ou deixe ambos vazios." };
      }
      if (breakStart !== null && breakEnd !== null && (breakEnd <= breakStart || breakStart < start || breakEnd > end)) {
        return { error: "O intervalo precisa estar dentro do horário de funcionamento." };
      }
    }
    const data = {
      isOpen,
      startMinutes: Number.isFinite(start) ? start : 540,
      endMinutes: Number.isFinite(end) ? end : 1080,
      breakStart: isOpen ? breakStart : null,
      breakEnd: isOpen ? breakEnd : null,
    };
    updates.push(
      db.workingHour.upsert({
        where: { businessId_weekday: { businessId: user.businessId, weekday } },
        update: data,
        create: { businessId: user.businessId, weekday, ...data },
      }),
    );
  }
  await db.$transaction(updates);
  revalidatePath("/painel/horarios");
  return { success: "Horários salvos." };
}

// ---------- Configurações ----------

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const schema = z.object({
    name: z.string().trim().min(2, "Informe o nome do estabelecimento."),
    slug: z.string().trim().min(3, "O endereço precisa ter pelo menos 3 caracteres."),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    description: z.string().trim().optional(),
    slotInterval: z.coerce.number().int().min(5).max(240),
    minAdvanceMinutes: z.coerce.number().int().min(0).max(10080),
    maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const slug = slugify(d.slug);
  if (slug.length < 3 || RESERVED_SLUGS.has(slug)) return { error: "Este endereço não está disponível." };
  const taken = await db.business.findFirst({ where: { slug, id: { not: user.businessId } } });
  if (taken) return { error: "Este endereço já está em uso por outro estabelecimento." };

  await db.business.update({
    where: { id: user.businessId },
    data: {
      name: d.name,
      slug,
      phone: d.phone || null,
      address: d.address || null,
      description: d.description || null,
      slotInterval: d.slotInterval,
      minAdvanceMinutes: d.minAdvanceMinutes,
      maxAdvanceDays: d.maxAdvanceDays,
    },
  });
  revalidatePath("/painel", "layout");
  return { success: "Configurações salvas." };
}
