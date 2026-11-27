// Contas de Finanças: taxa da maquininha, comissão do profissional e despesas fixas. Funções puras (testáveis).

export type Fees = { feePixBps: number; feeCashBps: number; feeDebitBps: number; feeCreditBps: number };

/** Taxa (em centavos) cobrada pela forma de pagamento. "CARD" antigo conta como crédito. */
export function feeFor(method: string | null | undefined, cents: number, f: Fees): number {
  const bps = method === "PIX" ? f.feePixBps : method === "CASH" ? f.feeCashBps : method === "DEBIT" ? f.feeDebitBps : method === "CREDIT" || method === "CARD" ? f.feeCreditBps : 0;
  return Math.round((cents * bps) / 10000);
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 3700; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Quantos meses o período cobre (para o salário): cada dia vale 1/(dias do mês). Novembro inteiro = 1. */
export function monthsCovered(from: string, to: string): number {
  return eachDay(from, to).reduce((s, d) => s + 1 / daysInMonth(+d.slice(0, 4), +d.slice(5, 7)), 0);
}

export const COMMISSION_TYPES = {
  NONE: "Não calcular",
  PERCENT: "% dos serviços",
  PER_SERVICE: "Valor por atendimento",
  SALARY: "Salário fixo",
} as const;
export type CommissionType = keyof typeof COMMISSION_TYPES;
export const isCommissionType = (v: unknown): v is CommissionType => typeof v === "string" && v in COMMISSION_TYPES;

export type CommissionRule = { commissionType: string; commissionRate: number; productCommissionBps: number };

/** Comissão do período: regra dos serviços + % sobre os produtos que ele vendeu. */
export function commissionFor(rule: CommissionRule, work: { services: number; serviceCents: number; productCents: number }, months: number): number {
  const base =
    rule.commissionType === "PERCENT"
      ? (work.serviceCents * rule.commissionRate) / 10000
      : rule.commissionType === "PER_SERVICE"
        ? work.services * rule.commissionRate
        : rule.commissionType === "SALARY"
          ? rule.commissionRate * months
          : 0;
  return Math.round(base + (work.productCents * rule.productCommissionBps) / 10000);
}

/** Texto curto da regra ("40% dos serviços", "R$ 15 por atendimento"...). */
export function ruleLabel(rule: CommissionRule): string {
  const money = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
  const pct = (bps: number) => `${(bps / 100).toLocaleString("pt-BR")}%`;
  const main =
    rule.commissionType === "PERCENT"
      ? `${pct(rule.commissionRate)} dos serviços`
      : rule.commissionType === "PER_SERVICE"
        ? `${money(rule.commissionRate)} por atendimento`
        : rule.commissionType === "SALARY"
          ? `Salário ${money(rule.commissionRate)}/mês`
          : "Sem comissão";
  return rule.productCommissionBps ? `${main} + ${pct(rule.productCommissionBps)} produtos` : main;
}

export type ExpenseRow = { date: string; recurring: boolean; endDate: string | null; amountCents: number };

/** Datas em que a despesa cai dentro do período (fixa: todo mês no mesmo dia; dia 31 vira o último dia do mês). */
export function expenseDates(e: ExpenseRow, from: string, to: string): string[] {
  if (!e.recurring) return e.date >= from && e.date <= to ? [e.date] : [];
  const out: string[] = [];
  const day = +e.date.slice(8);
  let y = +e.date.slice(0, 4), m = +e.date.slice(5, 7);
  for (let i = 0; i < 600; i++) {
    const d = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, daysInMonth(y, m))).padStart(2, "0")}`;
    if (d > to || (e.endDate && d > e.endDate)) break;
    if (d >= from) out.push(d);
    m++;
    if (m > 12) (m = 1), y++;
  }
  return out;
}

/** Período anterior do mesmo tamanho (para comparar). */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const len = eachDay(from, to).length;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

/** "18,5%" (ou null quando não dá para comparar). */
export function growth(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export const EXPENSE_CATEGORIES = { ALUGUEL: "Aluguel", CONTAS: "Contas (luz, água, internet)", MATERIAL: "Material", MARKETING: "Marketing", PESSOAL: "Pessoal", OUTROS: "Outros" } as const;
