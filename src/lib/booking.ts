import "server-only";
import { db } from "./db";
import { computeAvailableSlots, isSlotFree, type BusyInterval, type DayHours } from "./availability";
import { blockIntervals, closedPeriods, effectiveHours, emptyDayReason, type EmptyReason } from "./schedule";
import type { Prisma } from "@prisma/client";
import { diffDays, isValidDate, nowInTimezone, weekdayOf } from "./time";
import { normalizePhone } from "./format";

const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED"];

type BusinessRules = {
  id: string;
  slotInterval: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
};

type Db = Prisma.TransactionClient | typeof db;

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

type ProDay = { id: string; name: string; hours: DayHours | null; busy: BusyInterval[]; blocks: BusyInterval[] };

/**
 * Carrega, para cada profissional que faz o serviço, o horário do dia (próprio ou do estabelecimento),
 * os atendimentos já marcados e os bloqueios.
 */
async function loadDay(
  client: Db,
  businessId: string,
  serviceId: string,
  date: string,
  opts: { professionalId?: string | null; excludeAppointmentId?: string } = {},
): Promise<ProDay[]> {
  const weekday = weekdayOf(date);
  const pros = await client.professional.findMany({
    where: {
      businessId,
      active: true,
      ...(opts.professionalId ? { id: opts.professionalId } : {}),
      services: { some: { serviceId } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, customHours: true, hours: { where: { weekday } } },
  });
  if (pros.length === 0) return [];
  const ids = pros.map((p) => p.id);
  const [businessHours, appointments, blocks] = await Promise.all([
    client.workingHour.findMany({ where: { businessId, weekday } }),
    client.appointment.findMany({
      where: {
        businessId,
        date,
        professionalId: { in: ids },
        status: { in: ACTIVE_STATUSES },
        ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
      },
      select: { professionalId: true, startMinutes: true, endMinutes: true },
    }),
    client.timeBlock.findMany({
      where: {
        businessId,
        date: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
        AND: [{ OR: [{ professionalId: null }, { professionalId: { in: ids } }] }],
      },
    }),
  ]);
  return pros.map((p) => ({
    id: p.id,
    name: p.name,
    hours: effectiveHours(p, businessHours, weekday),
    busy: appointments.filter((a) => a.professionalId === p.id),
    blocks: blockIntervals(blocks, date, weekday, p.id),
  }));
}

/**
 * Horários disponíveis para um serviço em uma data.
 * Se professionalId for omitido, considera qualquer profissional que realize o serviço.
 */
export type DayAvailability = {
  slots: { time: number; professionalIds: string[] }[];
  /** Por que não há horários (para explicar ao cliente). WINDOW = fora do período aberto para agendamento. */
  empty: EmptyReason | "WINDOW" | null;
  /** Pausas e bloqueios no meio do dia (ex.: almoço, 11h às 13h) */
  closed: BusyInterval[];
};

export async function getAvailability(opts: {
  business: BusinessRules;
  serviceId: string;
  date: string;
  professionalId?: string | null;
  /** O painel do dono pode agendar fora da janela (ex.: encaixe de última hora). */
  enforceWindow?: boolean;
  /** Ao remarcar, o próprio agendamento não conta como ocupado. */
  excludeAppointmentId?: string;
}): Promise<DayAvailability> {
  const { business, serviceId, date, professionalId, enforceWindow = true } = opts;
  const none = (empty: DayAvailability["empty"]): DayAvailability => ({ slots: [], empty, closed: [] });
  if (!isValidDate(date)) return none("CLOSED");

  const service = await db.service.findFirst({ where: { id: serviceId, businessId: business.id, active: true } });
  if (!service) return none("CLOSED");

  const earliestStart = earliestStartFor(business, date, enforceWindow);
  if (earliestStart === null) return none("WINDOW");

  const pros = await loadDay(db, business.id, serviceId, date, { professionalId, excludeAppointmentId: opts.excludeAppointmentId });
  if (pros.length === 0) return none("CLOSED");

  const result = new Map<number, string[]>();
  for (const pro of pros) {
    const slots = computeAvailableSlots({
      hours: pro.hours,
      durationMinutes: service.durationMinutes,
      slotInterval: business.slotInterval,
      busy: pro.busy,
      blocks: pro.blocks,
      bufferMinutes: business.bufferMinutes,
      earliestStart,
    });
    for (const s of slots) result.set(s, [...(result.get(s) ?? []), pro.id]);
  }
  const slots = [...result.entries()].sort((a, b) => a[0] - b[0]).map(([time, professionalIds]) => ({ time, professionalIds }));
  return {
    slots,
    empty: slots.length ? null : emptyDayReason(pros, earliestStart, service.durationMinutes),
    closed: closedPeriods(pros),
  };
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

    const pros = await loadDay(tx, business.id, service.id, input.date, { professionalId: input.professionalId });
    if (pros.length === 0) throw new BookingError("Profissional não disponível para este serviço.");

    // Escolhe o primeiro profissional livre nesse horário
    const chosen = pros.find((p) =>
      isSlotFree({
        hours: p.hours,
        durationMinutes: service.durationMinutes,
        busy: p.busy,
        blocks: p.blocks,
        bufferMinutes: business.bufferMinutes,
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

/**
 * Muda dia e horário de um agendamento (mesmo serviço e mesmo profissional).
 * Zera os lembretes para que o cliente receba os da nova data.
 */
export async function rescheduleAppointment(input: {
  business: BusinessRules;
  appointmentId: string;
  date: string;
  startMinutes: number;
  enforceWindow: boolean;
}) {
  const { business } = input;
  if (!isValidDate(input.date)) throw new BookingError("Data inválida.");
  const earliestStart = earliestStartFor(business, input.date, input.enforceWindow);
  if (earliestStart === null) throw new BookingError("Data fora do período permitido para agendamento.");

  return db.$transaction(async (tx) => {
    const appt = await tx.appointment.findFirst({
      where: { id: input.appointmentId, businessId: business.id, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { service: true },
    });
    if (!appt) throw new BookingError("Agendamento não encontrado ou já encerrado.");
    const duration = appt.endMinutes - appt.startMinutes;
    const [pro] = await loadDay(tx, business.id, appt.serviceId, input.date, {
      professionalId: appt.professionalId,
      excludeAppointmentId: appt.id,
    });
    const free =
      pro &&
      isSlotFree({
        hours: pro.hours,
        durationMinutes: duration,
        busy: pro.busy,
        blocks: pro.blocks,
        bufferMinutes: business.bufferMinutes,
        startMinutes: input.startMinutes,
        earliestStart,
      });
    if (!free) throw new BookingError("Este horário não está mais livre. Escolha outro.");
    return tx.appointment.update({
      where: { id: appt.id },
      data: {
        date: input.date,
        startMinutes: input.startMinutes,
        endMinutes: input.startMinutes + duration,
        status: "SCHEDULED",
        confirmationSentAt: null,
        reminderDaySentAt: null,
        reminderShortSentAt: null,
      },
    });
  });
}
