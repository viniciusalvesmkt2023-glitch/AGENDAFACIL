import "./admin.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { BrandIcon } from "@/components/ui";
import { AdminSideNav, AdminTabs } from "./nav";

export const metadata = { title: "Admin · HoraBoa", robots: { index: false } };

/** Painel admin do HoraBoa (só para os e-mails em ADMIN_EMAILS). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const pending = await db.payment.count({ where: { status: "PENDING", createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  return (
    <div className="ad">
      <div className="ad-app">
        <aside className="ad-side" aria-label="Menu do admin">
          <Link href="/admin" className="ad-brand"><BrandIcon className="h-[30px] w-[30px]" />Hora<span>Boa</span><em>ADMIN</em></Link>
          <AdminSideNav pending={pending} />
          <div className="ad-me">
            <span className="ad-av ad-g-brand">{user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0"><b className="truncate">{user.name.split(" ")[0]}</b><span className="block truncate">{user.email}</span></div>
          </div>
          <Link href="/painel" className="ad-nav"><span className="ad-ic" style={{ background: "rgba(0,0,0,.05)" }}><ArrowLeft /></span>Meu painel</Link>
        </aside>
        <main className="ad-main">{children}</main>
      </div>
      <AdminTabs />
    </div>
  );
}
