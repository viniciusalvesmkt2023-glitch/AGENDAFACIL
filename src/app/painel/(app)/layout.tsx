import { requireActiveUser } from "@/lib/auth";

// Telas que exigem teste grátis ou assinatura ativa
export default async function ActiveLayout({ children }: { children: React.ReactNode }) {
  await requireActiveUser();
  return children;
}
