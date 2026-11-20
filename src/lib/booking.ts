import "server-only";
import { db } from "./db";
import { computeAvailableSlots, isSlotFree, type BusyInterval, type DayHours } from "./availability";
import { diffDays, isValidDate, nowInTimezone, weekdayOf } from "./time";
import { normalizePhone } from "./format";

const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED"];

type BusinessRules = {
  id: string;
  slotInterval: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
};

/**
 * Menor horário (em minutos) permitido para a data, considerando a antecedência mínima.
 * Retorna null se a data inteira estiver fora da janela de agendamento.
 */
function earliestStartFor(business: BusinessRules, date: string, enforceWindow: boolean): number | null {
  const now = nowInTimezone();
  const daysAhead = diffDays(now.date, date);
  if (!enforceWindow) return 0;
  if (daysAhead < 0 || daysAhead > business.maxAdvanceDays) return null;
  if (daysAhead === 0) return now.minutes + business.minAdvanceMinutes;
  if (daysAhead === 1) return Math.max(0, now.minutes + business.minAdvanceMinutes - 24 * 60);
  return 0;
}

async function loadDay(businessId: string, date: string, professionalIds: string[]) {
  const [hours, appointments] = await Promise.all([
    db.workingHour.findUnique({ where: { businessId_weekday: { businessId, weekday: weekdayOf(date) } } }),
    db.appointment.findMany({
      where: { businessId, date, professionalId: { in: professionalIds }, status: { in: ACTIVE_STATUSES } },
      select: { professionalId: true, startMinutes: true, endMinutes: true },
    }),
  ]);
  const busyByPro = new Map<string, BusyInterval[]>();
  for (const id of professionalIds) busyByPro.set(id, []);
  for (const a of appointments) busyByPro.get(a.professionalId)?.push(a);
  return { hours: hours as DayHours | null, busyByPro };
}

async function eligibleProfessionals(businessId: string, serviceId: string, professionalId?: string | null) {
  return db.professional.findMany({
    where: {
      businessId,
      active: true,
      ...(professionalId ? { id: professionalId } : {}),
      services: { some: { serviceId } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * Horários disponíveis para um serviço em uma data.
 * Se professionalId for omitido, considera qualquer profissional que realize o serviço.
 */
export async function getAvailability(opts: {
  business: BusinessRules;
  serviceId: string;
  date: string;
  professionalId?: string | null;
  /** O painel do dono pode agendar fora da janela (ex.: encaixe de última hora). */
  enforceWindow?: boolean;
}): Promise<{ time: number; professionalIds: string[] }[]> {
  const { business, serviceId, date, professionalId, enforceWindow = true } = opts;
  if (!isValidDate(date)) return [];

  const service = await db.service.findFirst({ where: { id: serviceId, businessId: business.id, active: true } });
  if (!service) return [];

  const earliestStart = earliestStartFor(business, date, enforceWindow);
  if (earliestStart === null) return [];

  const pros = await eligibleProfessionals(business.id, serviceId, professionalId);
  if (pros.length === 0) return [];

  const { hours, busyByPro } = await loadDay(business.id, date, pros.map((p) => p.id));

  const result = new Map<number, string[]>();
  for (const pro of pros) {
    const slots = computeAvailableSlots({
      hours,
      durationMinutes: service.durationMinutes,
      slotInterval: business.slotInterval,
      busy: busyByPro.get(pro.id) ?? [],
      earliestStart,
    });
    for (const s of slots) result.set(s, [...(result.get(s) ?? []), pro.id]);
  }
  return [...result.entries()].sort((a, b) => a[0] - b[0]).map(([time, professionalIds]) => ({ time, professionalIds }));
}

export class BookingError extends Error {}

/**
 * Cria um agendamento validando disponibilidade dentro de uma transação,
 * para evitar dois clientes no mesmo horário.
 */
export async function createAppointment(input: {
  business: BusinessRules;
  serviceId: string;
  professionalId?: string | null;
  date: string;
  startMinutes: number;
  clientName: string;
  clientPhone: string;
  notes?: string | null;
  source: "ONLINE" | "MANUAL";
}) {
  const { business } = input;
  const enforceWindow = input.source === "ONLINE";
  if (!isValidDate(input.date)) throw new BookingError("Data inválida.");

  const earliestStart = earliestStartFor(business, input.date, enforceWindow);
  if (earliestStart === null) throw new BookingError("Data fora do período permitido para agendamento.");

  const phone = normalizePhone(input.clientPhone);
  if (phone.length < 12) throw new BookingError("Informe um telefone válido com DDD.");

  return db.$transaction(async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: input.serviceId, businessId: business.id, active: true },
    });
    if (!service) throw new BookingError("Serviço não encontrado.");

    const pros = await tx.professional.findMany({
      where: {
        businessId: business.id,
        active: true,
        ...(input.professionalId ? { id: input.professionalId } : {}),
        services: { some: { serviceId: service.id } },
      },
      orderBy: { name: "asc" },
    });
    if (pros.length === 0) throw new BookingError("Profissional não disponível para este serviço.");

    const hours = await tx.workingHour.findUnique({
      where: { businessId_weekday: { businessId: business.id, weekday: weekdayOf(input.date) } },
    });
    const busy = await tx.appointment.findMany({
      where: {
        businessId: business.id,
        date: input.date,
        professionalId: { in: pros.map((p) => p.id) },
        status: { in: ACTIVE_STATUSES },
      },
      select: { professionalId: true, startMinutes: true, endMinutes: true },
    });

    // Escolhe o primeiro profissional livre nesse horário
    const chosen = pros.find((p) =>
      isSlotFree({
        hours,
        durationMinutes: service.durationMinutes,
        busy: busy.filter((b) => b.professionalId === p.id),
        startMinutes: input.startMinutes,
        earliestStart,
      }),
    );
    if (!chosen) throw new BookingError("Este horário acabou de ser ocupado. Escolha outro horário.");

    const client = await tx.client.upsert({
      where: { businessId_phone: { businessId: business.id, phone } },
      update: { name: input.clientName },
      create: { businessId: business.id, name: input.clientName, phone },
    });

    return tx.appointment.create({
      data: {
        businessId: business.id,
        professionalId: chosen.id,
        serviceId: service.id,
        clientId: client.id,
        date: input.date,
        startMinutes: input.startMinutes,
        endMinutes: input.startMinutes + service.durationMinutes,
        priceCents: service.priceCents,
        notes: input.notes || null,
        source: input.source,
        status: "SCHEDULED",
      },
      include: { service: true, professional: true, client: true },
    });
  });
}
