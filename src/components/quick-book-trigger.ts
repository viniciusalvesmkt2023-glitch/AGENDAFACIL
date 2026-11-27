// Abre a janela de Agendamento rápido de qualquer lugar do painel (botão +, agenda, Agendamentos).
export type QuickBookPreset = { date?: string; time?: number; professionalId?: string };

export const QUICK_BOOK_EVENT = "horaboa:quickbook";

export function openQuickBook(preset: QuickBookPreset = {}) {
  window.dispatchEvent(new CustomEvent<QuickBookPreset>(QUICK_BOOK_EVENT, { detail: preset }));
}
