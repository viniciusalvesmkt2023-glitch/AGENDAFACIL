"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendAppointmentMessage } from "@/lib/notifications";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser, requireUser } from "@/lib/auth";
import { BookingError, createAppointment, rescheduleAppointment } from "@/lib/booking";
import { parseMoneyToCents } from "@/lib/format";
import { checkSlug } from "@/lib/slug-check";
import { CANCEL_POLICIES } from "@/lib/policy";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/images";
import { timeToMinutes } from "@/lib/time";
import { EMPTY_ADDRESS, parseAddress } from "@/lib/address";

export type ActionState = { error?: string | null; success?: string | null; values?: Record<string, string> } | undefined;

const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"] as const;

// ---------- Agendamentos ----------

export async function updateAppointmentStatus(formData: FormData) {
  const user = await requireActiveUser();
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
  const user = await requireActiveUser();
  const schema = z.object({
    serviceId: z.string().min(1, "Escolha o serviço."),
    professionalId: z.string().optional(),
    date: z.string().min(1, "Escolha a data."),
    time: z.string().min(1, "Escolha o horário."),
    clientName: z.string().trim().min(2, "Informe o nome do cliente."),
    clientPhone: z.string().trim().min(8, "Informe o telefone do cliente."),
    notes: z.string().trim().optional(),
  });
  const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$"))) as Record<string, string>;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const d = parsed.data;

  try {
    const appointment = await createAppointment({
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
    if (formData.get("sendWhatsapp") === "on") {
      after(() => sendAppointmentMessage(appointment.id, "CONFIRMATION"));
    }
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, values };
    throw e;
  }
  revalidatePath("/painel");
  redirect(`/painel?data=${d.date}`);
}

export async function rescheduleByOwner(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
  const id = String(formData.get("id"));
  const date = String(formData.get("date") ?? "");
  const time = Number(formData.get("time"));
  if (!date || formData.get("time") === "" || !Number.isFinite(time)) return { error: "Escolha o novo dia e horário." };
  try {
    // O dono pode remarcar fora da janela do link (antecedência/limite de dias)
    await rescheduleAppointment({ business: user.business, appointmentId: id, date, startMinutes: time, enforceWindow: false });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  if (formData.get("notify") === "on") after(() => sendAppointmentMessage(id, "CONFIRMATION"));
  revalidatePath("/painel");
  redirect(`/painel?data=${date}`);
}

// ---------- Serviços ----------

type PhotoUpload = { image: { mime: string; data: Uint8Array<ArrayBuffer> } | null } | { error: string };

/** Lê a foto enviada no campo "image" (já reduzida no navegador) e confere se é imagem de verdade. */
async function readPhoto(formData: FormData): Promise<PhotoUpload> {
  const file = formData.get("image");
  if (!(file instanceof Blob) || file.size === 0) return { image: null };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Foto muito grande. Tente outra." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { error: "Use uma foto JPG, PNG ou WebP." };
  return { image: { mime, data: bytes } };
}

export async function saveService(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
  const schema = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Informe o nome do serviço."),
    description: z.string().trim().optional(),
    durationMinutes: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(600),
    price: z.string().min(1, "Informe o preço."),
  });
  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, name, description, durationMinutes, price } = parsed.data;
  const priceCents = parseMoneyToCents(price);
  if (!Number.isFinite(priceCents) || priceCents < 0) return { error: "Preço inválido." };

  // Foto (opcional): já vem reduzida do navegador
  const photo = await readPhoto(formData);
  if ("error" in photo) return { error: photo.error };
  const image = photo.image;
  const removePhoto = formData.get("removeImage") === "1";

  let serviceId = id;
  let oldImageId: string | null = null;
  if (id) {
    const existing = await db.service.findFirst({ where: { id, businessId: user.businessId } });
    if (!existing) return { error: "Serviço não encontrado." };
    oldImageId = existing.imageId;
    await db.service.update({ where: { id }, data: { name, description: description || null, durationMinutes, priceCents } });
  } else {
    const service = await db.service.create({
      data: { businessId: user.businessId, name, description: description || null, durationMinutes, priceCents },
    });
    serviceId = service.id;
    // Por padrão, todos os profissionais ativos realizam o novo serviço
    const pros = await db.professional.findMany({ where: { businessId: user.businessId, active: true } });
    if (pros.length) {
      await db.professionalService.createMany({
        data: pros.map((p) => ({ professionalId: p.id, serviceId: service.id })),
      });
    }
  }

  if (image || removePhoto) {
    const img = image ? await db.businessImage.create({ data: { businessId: user.businessId, kind: "SERVICE", ...image } }) : null;
    await db.service.update({ where: { id: serviceId }, data: { imageId: img?.id ?? null } });
    if (oldImageId) await db.businessImage.deleteMany({ where: { id: oldImageId, businessId: user.businessId } });
  }

  revalidatePath("/painel/servicos");
  revalidatePath(`/${user.business.slug}`);
  return { success: id ? "Serviço atualizado." : "Serviço criado." };
}

export async function toggleService(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id"));
  const service = await db.service.findFirst({ where: { id, businessId: user.businessId } });
  if (service) await db.service.update({ where: { id }, data: { active: !service.active } });
  revalidatePath("/painel/servicos");
}

// ---------- Profissionais ----------

export async function saveProfessional(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
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

  // Foto (opcional): já vem reduzida e quadrada do navegador
  const photo = await readPhoto(formData);
  if ("error" in photo) return { error: photo.error };
  const removePhoto = formData.get("removeImage") === "1";

  let proId = id;
  let oldImageId: string | null = null;
  if (id) {
    const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId } });
    if (!pro) return { error: "Profissional não encontrado." };
    oldImageId = pro.imageId;
    await db.$transaction([
      db.professional.update({ where: { id }, data: { name, phone: phone || null } }),
      db.professionalService.deleteMany({ where: { professionalId: id } }),
      db.professionalService.createMany({ data: serviceIds.map((serviceId) => ({ professionalId: id, serviceId })) }),
    ]);
  } else {
    const created = await db.professional.create({
      data: {
        businessId: user.businessId,
        name,
        phone: phone || null,
        services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
    proId = created.id;
  }

  if (photo.image || removePhoto) {
    const img = photo.image ? await db.businessImage.create({ data: { businessId: user.businessId, kind: "PROFESSIONAL", ...photo.image } }) : null;
    await db.professional.update({ where: { id: proId }, data: { imageId: img?.id ?? null } });
    if (oldImageId) await db.businessImage.deleteMany({ where: { id: oldImageId, businessId: user.businessId } });
  }

  revalidatePath("/painel/profissionais");
  revalidatePath(`/${user.business.slug}`);
  return { success: id ? "Profissional atualizado." : "Profissional cadastrado." };
}

export async function toggleProfessional(formData: FormData) {
  const user = await requireActiveUser();
  const id = String(formData.get("id"));
  const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId } });
  if (pro) await db.professional.update({ where: { id }, data: { active: !pro.active } });
  revalidatePath("/painel/profissionais");
}

// ---------- Horários de funcionamento ----------

type WeekRow = { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number; breakStart: number | null; breakEnd: number | null };

/** Lê os 7 dias do formulário de horários (open_N, start_N, end_N, breakStart_N, breakEnd_N). */
function parseWeek(formData: FormData): { rows: WeekRow[] } | { error: string } {
  const rows: WeekRow[] = [];
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
    rows.push({
      weekday,
      isOpen,
      startMinutes: Number.isFinite(start) ? start : 540,
      endMinutes: Number.isFinite(end) ? end : 1080,
      breakStart: isOpen ? breakStart : null,
      breakEnd: isOpen ? breakEnd : null,
    });
  }
  return { rows };
}

export async function saveWorkingHours(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
  const week = parseWeek(formData);
  if ("error" in week) return { error: week.error };
  await db.$transaction(
    week.rows.map(({ weekday, ...data }) =>
      db.workingHour.upsert({
        where: { businessId_weekday: { businessId: user.businessId, weekday } },
        update: data,
        create: { businessId: user.businessId, weekday, ...data },
      }),
    ),
  );
  revalidatePath("/painel/horarios");
  return { success: "Horários salvos." };
}

/** Horário próprio de um profissional (ou volta a seguir o do estabelecimento). */
export async function saveProfessionalHours(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
  const id = String(formData.get("professionalId") ?? "");
  const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId } });
  if (!pro) return { error: "Profissional não encontrado." };
  const custom = formData.get("customHours") === "on";
  if (!custom) {
    await db.professional.update({ where: { id }, data: { customHours: false } });
    revalidatePath("/painel/profissionais");
    return { success: `${pro.name} segue o horário do estabelecimento.` };
  }
  const week = parseWeek(formData);
  if ("error" in week) return { error: week.error };
  if (!week.rows.some((r) => r.isOpen)) return { error: "Marque pelo menos um dia de trabalho." };
  await db.$transaction([
    db.professional.update({ where: { id }, data: { customHours: true } }),
    ...week.rows.map(({ weekday, ...data }) =>
      db.professionalHour.upsert({
        where: { professionalId_weekday: { professionalId: id, weekday } },
        update: data,
        create: { professionalId: id, weekday, ...data },
      }),
    ),
  ]);
  revalidatePath("/painel/profissionais");
  return { success: `Horário de ${pro.name} salvo.` };
}

// ---------- Configurações ----------

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();
  const schema = z.object({
    name: z.string().trim().min(2, "Informe o nome do estabelecimento."),
    slug: z.string().trim().min(3, "O endereço precisa ter pelo menos 3 caracteres."),
    phone: z.string().trim().optional(),
    slotInterval: z.coerce.number().int().min(5).max(240),
    minAdvanceMinutes: z.coerce.number().int().min(0).max(10080),
    maxAdvanceDays: z.coerce.number().int().min(1).max(365),
    bufferMinutes: z.coerce.number().int().min(0).max(120).default(0),
    clientCancelPolicy: z.enum(CANCEL_POLICIES).default("FREE"),
    cancelDeadlineMinutes: z.coerce.number().int().min(15).max(10080).default(120),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const addr = parseAddress(Object.fromEntries(formData));
  if (addr.kind === "error") return { error: addr.error };

  const check = await checkSlug(d.slug, { businessId: user.businessId });
  if (!check.available) return { error: check.message };
  const slug = check.slug;

  await db.business.update({
    where: { id: user.businessId },
    data: {
      name: d.name,
      slug,
      phone: d.phone || null,
      // sem CEP preenchido mantém o endereço antigo (contas de antes do CEP)
      homeService: addr.kind === "home",
      ...(addr.kind === "ok" ? { ...addr.parts, address: addr.address } : addr.kind === "home" ? { ...EMPTY_ADDRESS, address: null } : {}),
      slotInterval: d.slotInterval,
      minAdvanceMinutes: d.minAdvanceMinutes,
      maxAdvanceDays: d.maxAdvanceDays,
      bufferMinutes: d.bufferMinutes,
      clientCancelPolicy: d.clientCancelPolicy,
      cancelDeadlineMinutes: d.cancelDeadlineMinutes,
      clientCanReschedule: formData.get("clientCanReschedule") === "on",
    },
  });
  revalidatePath("/painel", "layout");
  return { success: "Configurações salvas." };
}

// ---------- Tema do painel ----------

/** Alterna o painel entre claro e escuro (fica salvo na conta do usuário). */
export async function togglePanelTheme() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { panelTheme: user.panelTheme === "DARK" ? "LIGHT" : "DARK" } });
  revalidatePath("/painel", "layout");
}
