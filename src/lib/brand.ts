// Nome e dados da marca em um só lugar — para renomear o produto, altere aqui.
export const APP_NAME = "AgendaFácil";
export const SUPPORT_EMAIL = "contato@horaboa.com";

/** URL pública do sistema (usada em e-mails, mensagens e redirecionamentos de pagamento). */
export function appUrl(): string {
  const url = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
