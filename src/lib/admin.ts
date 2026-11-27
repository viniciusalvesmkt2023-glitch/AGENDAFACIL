import { notFound } from "next/navigation";
import { requireUser } from "./auth";

/** E-mails com acesso ao painel admin (variável ADMIN_EMAILS, separados por vírgula). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}

/** Exige login de um admin. Para quem não é admin, a página nem "existe" (404). */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
