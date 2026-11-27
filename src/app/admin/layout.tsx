import "../painel/painel.css";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { BrandIcon } from "@/components/ui";

export const metadata = { title: "Admin · HoraBoa", robots: { index: false } };

/** Painel admin do HoraBoa (só para os e-mails em ADMIN_EMAILS). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="pn">
      <div className="pn-bg" aria-hidden="true"><i /><i /></div>
      <header className="pn-top pn-glass" style={{ maxWidth: 980, marginInline: "auto" }}>
        <Link href="/admin" className="flex items-center gap-2" aria-label="Admin">
          <BrandIcon className="h-9 w-9" />
        </Link>
        <div className="pn-top-t">
          <b>HoraBoa · Admin</b>
          <small>{user.email}</small>
        </div>
        <nav className="flex items-center gap-1.5">
          <Link href="/admin/configuracoes" className="pn-btn sm soft"><Settings /> <span className="hidden sm:inline">Configurações</span></Link>
          <Link href="/painel" className="pn-btn sm soft" aria-label="Voltar ao meu painel"><ArrowLeft /> <span className="hidden sm:inline">Meu painel</span></Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[980px] px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
