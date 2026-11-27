import { db } from "@/lib/db";
import { addDays, localToUtc, minutesToTime, nowInTimezone, TIMEZONE } from "@/lib/time";
import { isPeriod, periodRange, type PeriodId } from "@/lib/appointments-list";
import { EXPENSE_CATEGORIES, commissionFor, eachDay, expenseDates, feeFor, monthsCovered, previousRange, ruleLabel, type Fees } from "@/lib/finance";
import { methodLabel } from "@/lib/quick-book";

export const FIN_PERIODS = ["hoje", "semana", "mes", "anterior", "datas"] as const;

export type FinParams = { periodo?: string; de?: string; ate?: string; aba?: string; f?: string };

export function readRange(p: FinParams, today: string) {
  const period: PeriodId = isPeriod(p.periodo) && p.periodo !== "proximos" ? p.periodo : "mes";
  return { period, ...periodRange(period, today, p.de, p.ate) };
}

const localDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
const localHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(d));

async function grossOf(businessId: string, from: string, to: string) {
  const [a, s] = await Promise.all([
    db.appointment.aggregate({ where: { businessId, date: { gte: from, lte: to }, paymentStatus: "PAID", status: { not: "CANCELED" } }, _sum: { priceCents: true } }),
    db.stockMove.aggregate({ where: { businessId, kind: "SALE", createdAt: { gte: localToUtc(from, 0), lt: localToUtc(addDays(to, 1), 0) } }, _sum: { totalCents: true } }),
  ]);
  return (a._sum.priceCents ?? 0) + (s._sum.totalCents ?? 0);
}

/** Tudo que a tela Finanças mostra, para um período. Considera só o que foi pago. */
export async function loadFinance(business: Fees & { id: string }, from: string, to: string) {
  const businessId = business.id;
  const today = nowInTimezone().date;
  const [appts, sales, expenses, pending, pros, prevGross] = await Promise.all([
    db.appointment.findMany({
      where: { businessId, date: { gte: from, lte: to }, paymentStatus: "PAID", status: { not: "CANCELED" } },
      include: { service: { select: { name: true } }, professional: { select: { id: true, name: true } }, client: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
    }),
    db.stockMove.findMany({
      where: { businessId, kind: "SALE", createdAt: { gte: localToUtc(from, 0), lt: localToUtc(addDays(to, 1), 0) } },
      include: { product: { select: { name: true } }, professional: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.expense.findMany({ where: { businessId, date: { lte: to } }, orderBy: { date: "desc" } }),
    db.appointment.findMany({
      where: { businessId, date: { gte: from, lte: to < today ? to : today }, paymentStatus: "PENDING", status: { notIn: ["CANCELED", "NO_SHOW"] } },
      include: { service: { select: { name: true } }, professional: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
    }),
    db.professional.findMany({ where: { businessId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    (() => {
      const prev = previousRange(from, to);
      return grossOf(businessId, prev.from, prev.to);
    })(),
  ]);

  const apptGross = appts.reduce((s, a) => s + a.priceCents, 0);
  const salesGross = sales.reduce((s, m) => s + (m.totalCents ?? 0), 0);
  const gross = apptGross + salesGross;
  const fees = appts.reduce((s, a) => s + feeFor(a.paymentMethod, a.priceCents, business), 0) + sales.reduce((s, m) => s + feeFor(m.paymentMethod, m.totalCents ?? 0, business), 0);
  const cogs = sales.reduce((s, m) => s + (m.costCents ?? 0), 0);
  const expenseRows = expenses.flatMap((e) => expenseDates(e, from, to).map((d) => ({ ...e, on: d })));
  const expenseTotal = expenseRows.reduce((s, e) => s + e.amountCents, 0);

  // Equipe: atendimentos pagos e produtos que cada um vendeu
  const months = monthsCovered(from, to);
  const team = pros
    .map((p) => {
      const mine = appts.filter((a) => a.professionalId === p.id);
      const serviceCents = mine.reduce((s, a) => s + a.priceCents, 0);
      const productCents = sales.filter((m) => m.professionalId === p.id).reduce((s, m) => s + (m.totalCents ?? 0), 0);
      // salário conta mesmo sem atendimento (se ele estava ativo)
      const commission = commissionFor(p, { services: mine.length, serviceCents, productCents }, p.active || mine.length ? months : 0);
      return { id: p.id, name: p.name, active: p.active, rule: ruleLabel(p), services: mine.length, serviceCents, productCents, commission };
    })
    .filter((t) => t.active || t.services || t.productCents);
  const commissions = team.reduce((s, t) => s + t.commission, 0);
  const net = gross - fees - commissions - cogs - expenseTotal;

  const byService = [...appts.reduce((m, a) => m.set(a.service.name, { n: (m.get(a.service.name)?.n ?? 0) + 1, cents: (m.get(a.service.name)?.cents ?? 0) + a.priceCents }), new Map<string, { n: number; cents: number }>())]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents);
  const byProduct = [
    ...sales.reduce(
      (m, s) =>
        m.set(s.product.name, {
          n: (m.get(s.product.name)?.n ?? 0) - s.quantity,
          cents: (m.get(s.product.name)?.cents ?? 0) + (s.totalCents ?? 0),
          cost: (m.get(s.product.name)?.cost ?? 0) + (s.costCents ?? 0),
          hasCost: (m.get(s.product.name)?.hasCost ?? false) || s.costCents != null,
        }),
      new Map<string, { n: number; cents: number; cost: number; hasCost: boolean }>(),
    ),
  ]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents);

  // Formas de pagamento
  const methods = new Map<string, { n: number; cents: number; fee: number }>();
  const addM = (m: string | null, cents: number) => {
    const k = m ?? "OUTRO";
    const cur = methods.get(k) ?? { n: 0, cents: 0, fee: 0 };
    methods.set(k, { n: cur.n + 1, cents: cur.cents + cents, fee: cur.fee + feeFor(m, cents, business) });
  };
  appts.forEach((a) => addM(a.paymentMethod, a.priceCents));
  sales.forEach((s) => addM(s.paymentMethod, s.totalCents ?? 0));

  // Gráfico: por hora (um dia), por dia (até 62 dias) ou por mês
  const days = eachDay(from, to);
  type Point = { key: string; label: string; appts: number; products: number };
  let points: Point[];
  if (days.length === 1) {
    const hours = [...appts.map((a) => Math.floor(a.startMinutes / 60)), ...sales.map((s) => localHour(s.createdAt))];
    const h0 = Math.min(8, ...hours), h1 = Math.max(19, ...hours);
    points = Array.from({ length: h1 - h0 + 1 }, (_, i) => ({ key: String(h0 + i), label: `${String(h0 + i).padStart(2, "0")}h`, appts: 0, products: 0 }));
    appts.forEach((a) => (points.find((p) => p.key === String(Math.floor(a.startMinutes / 60)))!.appts += a.priceCents));
    sales.forEach((s) => (points.find((p) => p.key === String(localHour(s.createdAt)))!.products += s.totalCents ?? 0));
  } else if (days.length <= 62) {
    // dias que ainda não chegaram não entram na linha (ficariam em zero)
    points = days.filter((d) => d <= today || d === days[0]).map((d) => ({ key: d, label: `${d.slice(8)}/${d.slice(5, 7)}`, appts: 0, products: 0 }));
    const idx = new Map(points.map((p, i) => [p.key, i]));
    appts.forEach((a) => (points[idx.get(a.date)!].appts += a.priceCents));
    sales.forEach((s) => {
      const i = idx.get(localDate(s.createdAt));
      if (i !== undefined) points[i].products += s.totalCents ?? 0;
    });
  } else {
    const keys = [...new Set(days.filter((d) => d <= today || d === days[0]).map((d) => d.slice(0, 7)))];
    const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    points = keys.map((k) => ({ key: k, label: `${MON[+k.slice(5) - 1]}/${k.slice(2, 4)}`, appts: 0, products: 0 }));
    const idx = new Map(points.map((p, i) => [p.key, i]));
    appts.forEach((a) => (points[idx.get(a.date.slice(0, 7))!].appts += a.priceCents));
    sales.forEach((s) => {
      const i = idx.get(localDate(s.createdAt).slice(0, 7));
      if (i !== undefined) points[i].products += s.totalCents ?? 0;
    });
  }

  // Extrato (entradas, a receber e saídas)
  type Line = { key: string; date: string; time: string; kind: "ATEND" | "PROD" | "DESP" | "RECEBER"; title: string; detail: string; who: string; method: string; cents: number };
  const lines: Line[] = [
    ...appts.map((a) => ({ key: a.id, date: a.date, time: minutesToTime(a.startMinutes), kind: "ATEND" as const, title: a.client.name, detail: a.service.name, who: a.professional.name, method: methodLabel(a.paymentMethod), cents: a.priceCents })),
    ...sales.map((s) => ({
      key: s.id,
      date: localDate(s.createdAt),
      time: new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(s.createdAt),
      kind: "PROD" as const,
      title: s.client?.name ?? "Venda no balcão",
      detail: `${s.product.name} ×${-s.quantity}`,
      who: s.professional?.name ?? "—",
      method: methodLabel(s.paymentMethod),
      cents: s.totalCents ?? 0,
    })),
    ...expenseRows.map((e) => ({ key: `${e.id}-${e.on}`, date: e.on, time: "", kind: "DESP" as const, title: e.description, detail: EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category, who: "—", method: "", cents: -e.amountCents })),
    ...pending.map((a) => ({ key: `r${a.id}`, date: a.date, time: minutesToTime(a.startMinutes), kind: "RECEBER" as const, title: a.client.name, detail: a.service.name, who: a.professional.name, method: "", cents: a.priceCents })),
  ].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return {
    gross,
    apptGross,
    salesGross,
    fees,
    commissions,
    cogs,
    expenseTotal,
    net,
    prevGross,
    pendingCents: pending.reduce((s, a) => s + a.priceCents, 0),
    pendingCount: pending.length,
    team,
    byService,
    byProduct,
    methods: [...methods].map(([k, v]) => ({ key: k, label: k === "OUTRO" ? "Não informado" : methodLabel(k), ...v })).sort((a, b) => b.cents - a.cents),
    points,
    lines,
    expenses,
    expenseRows,
  };
}
