import { CalendarX2, Clock } from "lucide-react";

/** Explicação quando o dia não tem horários (fechado, já passou, lotado). */
export function NoSlots({ message }: { message: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-600">
      <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
      <p>{message ?? "Nenhum horário livre nesta data. Escolha outro dia."}</p>
    </div>
  );
}

/** Aviso de períodos sem atendimento no meio do dia (ex.: almoço ou bloqueio das 11h às 13h). */
export function ClosedPeriods({ closed }: { closed: string[] }) {
  if (!closed.length) return null;
  return (
    <p className="mt-3 flex items-start gap-2 text-sm text-zinc-500">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Sem atendimento {closed.map((c) => `das ${c}`).join(" e ")}.</span>
    </p>
  );
}
