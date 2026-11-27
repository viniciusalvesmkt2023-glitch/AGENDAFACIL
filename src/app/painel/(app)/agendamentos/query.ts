import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isPeriod, periodRange, type PeriodId } from "@/lib/appointments-list";

export type ListParams = { periodo?: string; de?: string; ate?: string; situacao?: string; profissional?: string; pagamento?: string; q?: string };
export const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"] as const;

/** Filtros da tela Agendamentos (também usados na exportação). */
export function readFilters(p: ListParams, today: string) {
  const period: PeriodId = isPeriod(p.periodo) ? p.periodo : "mes";
  const range = periodRange(period, today, p.de, p.ate);
  const status = STATUSES.includes(p.situacao as (typeof STATUSES)[number]) ? p.situacao! : "";
  const payment = p.pagamento === "pago" || p.pagamento === "receber" ? p.pagamento : "";
  return { period, range, status, payment, professional: p.profissional ?? "", q: (p.q ?? "").trim().slice(0, 60) };
}

export function whereFor(businessId: string, f: ReturnType<typeof readFilters>): Prisma.AppointmentWhereInput {
  const digits = f.q.replace(/\D/g, "");
  return {
    businessId,
    date: { gte: f.range.from, lte: f.range.to },
    ...(f.status ? { status: f.status } : {}),
    ...(f.professional ? { professionalId: f.professional } : {}),
    ...(f.payment === "pago" ? { paymentStatus: "PAID" } : f.payment === "receber" ? { paymentStatus: "PENDING", status: { notIn: ["CANCELED", "NO_SHOW"] } } : {}),
    ...(f.q
      ? {
          OR: [
            { client: { name: { contains: f.q, mode: "insensitive" } } },
            { service: { name: { contains: f.q, mode: "insensitive" } } },
            ...(digits.length >= 3 ? [{ client: { phone: { contains: digits } } }] : []),
          ],
        }
      : {}),
  };
}

export function listAppointments(businessId: string, f: ReturnType<typeof readFilters>, take?: number) {
  return db.appointment.findMany({
    where: whereFor(businessId, f),
    include: { client: true, service: true, professional: true },
    orderBy: f.period === "proximos" ? [{ date: "asc" }, { startMinutes: "asc" }] : [{ date: "desc" }, { startMinutes: "desc" }],
    ...(take ? { take } : {}),
  });
}
