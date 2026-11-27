// Tela Agendamentos: períodos do filtro e leitura da planilha de importação. Funções puras (testáveis).

export const PERIODS = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "anterior", label: "Mês anterior" },
  { id: "proximos", label: "Próximos" },
  { id: "datas", label: "Escolher datas" },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];
export const isPeriod = (v: unknown): v is PeriodId => PERIODS.some((p) => p.id === v);

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isDate = (v: string | undefined) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Datas (de/até, inclusive) de cada período. */
export function periodRange(period: PeriodId, today: string, de?: string, ate?: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const monthStart = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  const monthEnd = (yy: number, mm: number) => addDays(mm === 12 ? monthStart(yy + 1, 1) : monthStart(yy, mm + 1), -1);
  switch (period) {
    case "hoje":
      return { from: today, to: today };
    case "semana": {
      const wd = new Date(`${today}T12:00:00Z`).getUTCDay();
      return { from: addDays(today, -wd), to: addDays(today, 6 - wd) };
    }
    case "mes":
      return { from: monthStart(y, m), to: monthEnd(y, m) };
    case "anterior":
      return m === 1 ? { from: monthStart(y - 1, 12), to: monthEnd(y - 1, 12) } : { from: monthStart(y, m - 1), to: monthEnd(y, m - 1) };
    case "proximos":
      return { from: today, to: addDays(today, 366) };
    case "datas": {
      const from = isDate(de) ? de! : today;
      const to = isDate(ate) && ate! >= from ? ate! : from;
      return { from, to };
    }
  }
}

// ---------- Importação ----------

export const IMPORT_COLUMNS = ["data", "horario", "cliente", "telefone", "servico", "profissional", "valor", "pago"] as const;

/** Tira acentos e deixa minúsculo (para achar serviço/profissional pelo nome). */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "27/11/2026", "2026-11-27", "27/11/26" ou data do Excel (número) → "2026-11-27". */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // número de série do Excel (dias desde 1899-12-30)
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return valid(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
}

/** "14:30", "14h30", "14h", "9:00" ou fração de dia do Excel → minutos. */
export function parseTime(v: unknown): number | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getUTCHours() * 60 + v.getUTCMinutes();
  if (typeof v === "number" && v >= 0 && v < 1) return Math.round(v * 24 * 60);
  const m = String(v ?? "").trim().toLowerCase().match(/^(\d{1,2})\s*[:h]\s*(\d{2})?\s*(min)?$/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/** "R$ 45,00", "45", "45.5" → centavos (vazio = null). */
export function parseMoney(v: unknown): number | null {
  if (typeof v === "number") return Math.round(v * 100);
  const s = String(v ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** "sim", "pago", "pix", "dinheiro", "cartão" → forma de pagamento (ou null = a receber). */
export function parsePaid(v: unknown): "PIX" | "CASH" | "CARD" | null {
  const s = fold(String(v ?? ""));
  if (!s || ["nao", "n", "a receber", "pendente", "0", "false"].includes(s)) return null;
  if (s.includes("pix")) return "PIX";
  if (s.includes("cart") || s.includes("credito") || s.includes("debito")) return "CARD";
  return "CASH";
}
