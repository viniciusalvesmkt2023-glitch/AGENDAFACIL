// Textos das mensagens de WhatsApp. O salão pode personalizar usando as variáveis abaixo.

export const MESSAGE_VARIABLES = [
  { key: "nome", description: "Primeiro nome do cliente" },
  { key: "estabelecimento", description: "Nome do seu estabelecimento" },
  { key: "quando", description: "Data e hora (ex.: amanhã às 14:00)" },
  { key: "servico", description: "Serviço agendado" },
  { key: "profissional", description: "Profissional" },
  { key: "link", description: "Link para o cliente ver ou cancelar" },
] as const;

export type MessageVars = Record<(typeof MESSAGE_VARIABLES)[number]["key"], string>;

export const DEFAULT_CONFIRMATION = `Olá, {nome}! ✅ Seu horário em *{estabelecimento}* está confirmado para {quando}.

✂️ {servico} com {profissional}

Para ver ou cancelar: {link}`;

export const DEFAULT_REMINDER = `Olá, {nome}! ⏰ Passando para lembrar do seu horário em *{estabelecimento}* {quando}.

✂️ {servico} com {profissional}

Se não puder vir, cancele por aqui: {link}`;

export const MAX_MESSAGE_LENGTH = 1000;

/** Troca {variavel} pelos valores. Variáveis desconhecidas ficam como estão. */
export function renderMessage(template: string, vars: MessageVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key as keyof MessageVars] : match,
  );
}

/** Exemplo usado na pré-visualização do painel. */
export const SAMPLE_VARS: MessageVars = {
  nome: "Maria",
  estabelecimento: "Seu Salão",
  quando: "amanhã às 14:00",
  servico: "Corte",
  profissional: "Ana",
  link: "https://.../agendamento/abc123",
};
