import { CalendarX2, Clock } from "lucide-react";

/** Explicação quando o dia não tem horários (fechado, já passou, lotado). */
export function NoSlots({ message }: { message: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
      <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
      <p>{message ?? "Nenhum horário livre nesta data. Escolha outro dia."}</p>
    </div>
  );
}

/** Aviso de períodos sem atendimento no meio do dia (ex.: almoço ou bloqueio das 11h às 13h). */
export function ClosedPeriods({ closed }: { closed: string[] }) {
  if (!closed.length) return null;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
        <Clock className="h-5 w-5" />
      </span>
      <p className="text-sm">
        <span className="block font-bold">Fechado neste período</span>
        Sem atendimento{" "}
        {closed.map((c, i) => (
          <span key={c}>
            {i > 0 && " e "}das <strong className="font-bold">{c}</strong>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
