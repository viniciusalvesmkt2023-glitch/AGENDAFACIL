// Lista de clientes do painel admin (com situação, totais e filtros).
import { db } from "./db";
import { clientStatus, type ClientStatus } from "./admin-stats";
import { getAccessState } from "./subscription";
import { addDays, todayInTimezone } from "./time";

export type ClientFilter = "TODOS" | ClientStatus;
export const FILTERS: { id: ClientFilter; label: string }[] = [
  { id: "TODOS", label: "Todos" },
  { id: "TESTE", label: "Teste grátis" },
  { id: "ATIVO", label: "Ativos" },
  { id: "VENCIDO", label: "Vencidos" },
  { id: "CANCELADO", label: "Cancelados" },
];
export const isFilter = (v: unknown): v is ClientFilter => FILTERS.some((f) => f.id === v);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function listClients(opts: { filter: ClientFilter; q?: string; waOff?: boolean }) {
  const now = new Date();
  const since = addDays(todayInTimezone(), -30);
  const [businesses, appts, paid] = await Promise.all([
    db.business.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, phone: true, createdAt: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true,
        plan: true, asaasPlan: true, whatsappStatus: true, whatsappConnectedAt: true,
        users: { select: { name: true, email: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.appointment.groupBy({ by: ["businessId"], where: { date: { gte: since }, status: { not: "CANCELED" } }, _count: true }),
    db.payment.groupBy({ by: ["businessId"], where: { status: "PAID" }, _sum: { amountCents: true } }),
  ]);
  const apptMap = new Map(appts.map((a) => [a.businessId, a._count]));
  const paidMap = new Map(paid.map((p) => [p.businessId, p._sum.amountCents ?? 0]));
  const all = businesses.map((b) => {
    const state = getAccessState(b, now);
    return {
      id: b.id, name: b.name, slug: b.slug, phone: b.phone, createdAt: b.createdAt,
      owner: b.users[0]?.name ?? "", email: b.users[0]?.email ?? "",
      plan: b.plan ?? b.asaasPlan, status: clientStatus(state), state,
      trialDaysLeft: state.kind === "trial" ? state.daysLeft : null,
      appts30: apptMap.get(b.id) ?? 0, paidCents: paidMap.get(b.id) ?? 0,
      whatsapp: b.whatsappStatus === "CONNECTED",
      whatsappDown: !!b.whatsappConnectedAt && b.whatsappStatus !== "CONNECTED",
    };
  });
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, f.id === "TODOS" ? all.length : all.filter((c) => c.status === f.id).length])) as Record<ClientFilter, number>;
  const q = norm(opts.q?.trim() ?? "");
  const rows = all.filter(
    (c) =>
      (opts.filter === "TODOS" || c.status === opts.filter) &&
      (!opts.waOff || c.whatsappDown) &&
      (!q || [c.name, c.owner, c.email, c.slug, c.phone ?? ""].some((s) => norm(s).includes(q))),
  );
  return { rows, counts };
}
