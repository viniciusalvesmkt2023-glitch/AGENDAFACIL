// Motor de disponibilidade: calcula os horários livres de um profissional em um dia.
// Funções puras (sem banco de dados) para facilitar testes.

export type DayHours = {
  isOpen: boolean;
  startMinutes: number;
  endMinutes: number;
  breakStart?: number | null;
  breakEnd?: number | null;
};

export type BusyInterval = { startMinutes: number; endMinutes: number };

export type SlotParams = {
  hours: DayHours | null | undefined;
  durationMinutes: number;
  slotInterval: number;
  busy: BusyInterval[];
  /** Se a data for hoje, horários antes deste minuto são descartados. */
  earliestStart?: number;
  /** Intervalo livre obrigatório depois de cada atendimento (minutos). */
  bufferMinutes?: number;
  /** Períodos bloqueados (folga, compromisso). Não recebem o intervalo extra. */
  blocks?: BusyInterval[];
};

/** O horário [start, end) conflita com algum atendimento (com intervalo) ou bloqueio? */
function conflicts(start: number, end: number, busy: BusyInterval[], blocks: BusyInterval[], buffer: number): boolean {
  // Com intervalo: o novo atendimento precisa de folga depois dele, e os existentes também
  if (busy.some((b) => overlaps(start, end + buffer, b.startMinutes, b.endMinutes + buffer))) return true;
  return blocks.some((b) => overlaps(start, end, b.startMinutes, b.endMinutes));
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeAvailableSlots({
  hours,
  durationMinutes,
  slotInterval,
  busy,
  earliestStart = 0,
  bufferMinutes = 0,
  blocks = [],
}: SlotParams): number[] {
  if (!hours || !hours.isOpen || durationMinutes <= 0 || slotInterval <= 0) return [];

  const slots: number[] = [];
  const hasBreak =
    hours.breakStart != null && hours.breakEnd != null && hours.breakEnd > hours.breakStart;

  for (let start = hours.startMinutes; start + durationMinutes <= hours.endMinutes; start += slotInterval) {
    const end = start + durationMinutes;
    if (start < earliestStart) continue;
    if (hasBreak && overlaps(start, end, hours.breakStart!, hours.breakEnd!)) continue;
    if (conflicts(start, end, busy, blocks, bufferMinutes)) continue;
    slots.push(start);
  }
  return slots;
}

/** Verifica se um horário específico está livre (usado ao confirmar o agendamento). */
export function isSlotFree(params: Omit<SlotParams, "slotInterval"> & { startMinutes: number }): boolean {
  const { hours, durationMinutes, busy, startMinutes, earliestStart = 0, bufferMinutes = 0, blocks = [] } = params;
  if (!hours || !hours.isOpen) return false;
  const end = startMinutes + durationMinutes;
  if (startMinutes < hours.startMinutes || end > hours.endMinutes) return false;
  if (startMinutes < earliestStart) return false;
  if (
    hours.breakStart != null &&
    hours.breakEnd != null &&
    overlaps(startMinutes, end, hours.breakStart, hours.breakEnd)
  )
    return false;
  return !conflicts(startMinutes, end, busy, blocks, bufferMinutes);
}
