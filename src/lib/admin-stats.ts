// Números do painel admin, calculados direto do banco (fuso do Brasil).
import { db } from "./db";
import { PLANS, isPlanId, monthlyEquivalentCents } from "./plans";
import { getAccessState, type AccessState } from "./subscription";
import { addDays, localToUtc, TIMEZONE, todayInTimezone } from "./time";

export type Period = "hoje" | "7" | "30" | "12m";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "12m", label: "12 meses" },
];
export const isPeriod = (v: unknown): v is Period => PERIODS.some((p) => p.id === v);

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });

/** Data local "YYYY-MM-DD" e hora local de um instante. */
export function localParts(d: Date) {
  const p = fmt.formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")) };
}

function monthStart(ym: string) {
  return localToUtc(`${ym}-01`, 0);
}
function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type Bucket = { key: string; label: string; cents: number; count: number; current: boolean };

/** Intervalo do período, o anterior (para comparar) e as "caixinhas" do gráfico. */
export function periodRange(period: Period, today = todayInTimezone()) {
  if (period === "hoje") {
    const start = localToUtc(today, 0);
    const end = localToUtc(addDays(today, 1), 0);
    const prevStart = localToUtc(addDays(today, -1), 0);
    const keys = Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${String(h).padStart(2, "0")}h` }));
    return { start, end, prevStart, keys, by: "hour" as const };
  }
  if (period === "12m") {
    const ym = today.slice(0, 7);
    const first = addMonths(ym, -11);
    const keys = Array.from({ length: 12 }, (_, i) => {
      const k = addMonths(first, i);
      return { key: k, label: MONTHS[Number(k.slice(5)) - 1] };
    });
    return { start: monthStart(first), end: monthStart(addMonths(ym, 1)), prevStart: monthStart(addMonths(first, -12)), keys, by: "month" as const };
  }
  const n = period === "7" ? 7 : 30;
  const first = addDays(today, -(n - 1));
  const keys = Array.from({ length: n }, (_, i) => {
    const d = addDays(first, i);
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    return { key: d, label: n === 7 ? WEEK[wd] : `${Number(d.slice(8))}/${Number(d.slice(5, 7))}` };
  });
  return { start: localToUtc(first, 0), end: localToUtc(addDays(today, 1), 0), prevStart: localToUtc(addDays(first, -n), 0), keys, by: "day" as const };
}

/** Vendas (pagamentos confirmados) no período, agrupadas para o gráfico. */
export async function salesSeries(period: Period) {
  const r = periodRange(period);
  const today = todayInTimezone();
  const nowHour = localParts(new Date()).hour;
  const [paid, prev] = await Promise.all([
    db.payment.findMany({ where: { status: "PAID", paidAt: { gte: r.start, lt: r.end } }, select: { paidAt: true, amountCents: true } }),
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: r.prevStart, lt: r.start } }, _sum: { amountCents: true }, _count: true }),
  ]);
  const buckets: Bucket[] = r.keys.map((k) => ({
    ...k,
    cents: 0,
    count: 0,
    current: r.by === "hour" ? Number(k.key) === nowHour : r.by === "day" ? k.key === today : k.key === today.slice(0, 7),
  }));
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of paid) {
    if (!p.paidAt) continue;
    const lp = localParts(p.paidAt);
    const key = r.by === "hour" ? String(lp.hour) : r.by === "day" ? lp.date : lp.date.slice(0, 7);
    const i = idx.get(key);
    if (i !== undefined) {
      buckets[i].cents += p.amountCents;
      buckets[i].count += 1;
    }
  }
  const total = buckets.reduce((a, b) => a + b.cents, 0);
  const count = buckets.reduce((a, b) => a + b.count, 0);
  const prevTotal = prev._sum.amountCents ?? 0;
  return { buckets, total, count, prevTotal, prevCount: prev._count, by: r.by };
}

export type ClientStatus = "TESTE" | "ATIVO" | "VENCIDO" | "CANCELADO";
/** Situação do cliente para o admin (a partir das regras de acesso). */
export function clientStatus(state: AccessState): ClientStatus {
  if (state.kind === "trial") return "TESTE";
  if (state.kind === "active") return "ATIVO";
  if (state.kind === "blocked" && state.reason === "canceled") return "CANCELADO";
  return "VENCIDO";
}
export const STATUS_LABEL: Record<ClientStatus, string> = { TESTE: "Teste grátis", ATIVO: "Ativo", VENCIDO: "Vencido", CANCELADO: "Cancelado" };

/** Visão geral: números do topo, funil, planos, formas de pagamento, alertas e uso. */
export async function overview() {
  const now = new Date();
  const today = todayInTimezone();
  const dayStart = localToUtc(today, 0);
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const in3 = new Date(now.getTime() + 3 * 86_400_000);
  const monthStartUtc = monthStart(today.slice(0, 7));

  const [businesses, recent, signups30, methods30, pending24, apptsToday, onlineToday, msgsToday, remindersToday, signups14] = await Promise.all([
    db.business.findMany({
      select: { id: true, name: true, slug: true, phone: true, createdAt: true, onboardedAt: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true, plan: true, asaasPlan: true, whatsappConnectedAt: true, whatsappStatus: true, users: { select: { name: true }, take: 1, orderBy: { createdAt: "asc" } } },
    }),
    db.payment.findMany({ where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 8, include: { business: { select: { id: true, name: true } } } }),
    db.business.findMany({
      where: { createdAt: { gte: d30 } },
      select: { id: true, onboardedAt: true, _count: { select: { appointments: true } }, payments: { where: { status: "PAID" }, select: { id: true }, take: 1 } },
    }),
    db.payment.groupBy({ by: ["method"], where: { status: "PAID", paidAt: { gte: d30 } }, _count: true }),
    db.payment.count({ where: { status: "PENDING", createdAt: { gte: new Date(now.getTime() - 86_400_000) } } }),
    db.appointment.count({ where: { createdAt: { gte: dayStart } } }),
    db.appointment.count({ where: { createdAt: { gte: dayStart }, source: "ONLINE" } }),
    db.messageLog.count({ where: { createdAt: { gte: dayStart }, status: "SENT" } }),
    db.messageLog.count({ where: { createdAt: { gte: dayStart }, status: "SENT", type: { not: "CONFIRMATION" } } }),
    db.business.findMany({ where: { createdAt: { gte: localToUtc(addDays(today, -13), 0) } }, select: { createdAt: true } }),
  ]);

  const states = businesses.map((b) => ({ b, state: getAccessState(b, now) }));
  const paying = states.filter((s) => s.state.kind === "active" && s.b.subscriptionStatus !== "TRIALING");
  const planOf = (b: (typeof businesses)[number]) => b.plan ?? b.asaasPlan;
  const mrr = paying.reduce((sum, s) => {
    const p = planOf(s.b);
    return sum + (isPlanId(p) ? monthlyEquivalentCents(PLANS[p]) : 0);
  }, 0);
  const trial = states.filter((s) => s.state.kind === "trial");
  const ending = trial.filter((s) => s.b.trialEndsAt <= in3).sort((a, b) => a.b.trialEndsAt.getTime() - b.b.trialEndsAt.getTime());
  const late = states.filter((s) => s.state.kind === "grace" || (s.state.kind === "blocked" && s.state.reason === "expired"));
  const waDown = businesses.filter((b) => b.whatsappConnectedAt && b.whatsappStatus !== "CONNECTED");
  const newPaying = await db.payment.groupBy({ by: ["businessId"], where: { status: "PAID" }, _min: { paidAt: true } })
    .then((rows) => rows.filter((r) => r._min.paidAt && r._min.paidAt >= monthStartUtc).length);

  const planCounts = { MONTHLY: 0, SEMIANNUAL: 0, ANNUAL: 0 } as Record<string, number>;
  for (const s of paying) {
    const p = planOf(s.b);
    if (p && p in planCounts) planCounts[p] += 1;
  }
  const signupDays = Array.from({ length: 14 }, (_, i) => ({ date: addDays(today, i - 13), count: 0 }));
  for (const s of signups14) {
    const d = localParts(s.createdAt).date;
    const row = signupDays.find((x) => x.date === d);
    if (row) row.count += 1;
  }

  return {
    mrr,
    payingCount: paying.length,
    newPaying,
    trialCount: trial.length,
    ending: ending.slice(0, 6).map((s) => ({ id: s.b.id, name: s.b.name, phone: s.b.phone, owner: s.b.users[0]?.name ?? "", endsAt: s.b.trialEndsAt })),
    endingCount: ending.length,
    recent: recent.map((p) => ({ id: p.id, businessId: p.business.id, name: p.business.name, plan: p.plan, method: p.method, cents: p.amountCents, at: p.paidAt ?? p.createdAt })),
    funnel: {
      created: signups30.length,
      configured: signups30.filter((b) => b.onboardedAt).length,
      firstBooking: signups30.filter((b) => b._count.appointments > 0).length,
      paid: signups30.filter((b) => b.payments.length > 0).length,
    },
    plans: planCounts,
    methods: Object.fromEntries(methods30.map((m) => [m.method, m._count])) as Record<string, number>,
    attention: { late: late.map((s) => s.b.name), waDown: waDown.length, pending24 },
    usage: { apptsToday, onlineToday, msgsToday, remindersToday },
    signupDays,
    totals: { all: businesses.length },
  };
}
