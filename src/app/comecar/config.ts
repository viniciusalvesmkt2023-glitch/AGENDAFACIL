// Passos da configuração inicial e opções compartilhadas entre as telas e as ações.

export const STEPS = [
  { n: 1, title: "Seu negócio" },
  { n: 2, title: "Serviços" },
  { n: 3, title: "Horários" },
  { n: 4, title: "Regras" },
  { n: 5, title: "WhatsApp" },
] as const;

export const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];
export const MIN_ADVANCE_OPTIONS = [
  { value: 0, label: "Na hora", text: "até o último minuto antes do horário" },
  { value: 30, label: "30 min", text: "até 30 minutos antes do horário" },
  { value: 60, label: "1 hora", text: "até 1 hora antes do horário" },
  { value: 120, label: "2 horas", text: "até 2 horas antes do horário" },
  { value: 240, label: "4 horas", text: "até 4 horas antes do horário" },
  { value: 1440, label: "1 dia", text: "até 1 dia antes do horário" },
];
export const MAX_DAYS_OPTIONS = [7, 14, 30, 60, 90];
export const DURATION_OPTIONS = [10, 15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180, 240];
