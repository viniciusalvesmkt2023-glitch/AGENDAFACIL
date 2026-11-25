import Link from "next/link";
import { AlertTriangle, Clock3, ExternalLink, LogOut, WifiOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BrandIcon, Logo } from "@/components/ui";
import { BottomNav, SidebarNav } from "@/components/nav";
import { CopyButton, ShareLinkButton } from "@/components/copy-button";
import { logout } from "../(auth)/actions";
import { getAccessState } from "@/lib/subscription";
import { evolutionConfigured } from "@/lib/evolution";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const b = user.business;
  const publicPath = `/${b.slug}`;
  const access = getAccessState(b);
  const whatsappDown = evolutionConfigured() && b.whatsappConnectedAt && b.whatsappStatus !== "CONNECTED";

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (computador) */}
      <aside className="hidden border-r border-zinc-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:p-4">
        <div className="mb-6 px-1">
          <Logo href="/painel" />
        </div>
        <div className="mb-5 rounded-2xl bg-navy-50 p-3">
          <p className="truncate font-display text-sm font-bold text-navy-900">{b.name}</p>
          <Link href={publicPath} target="_blank" className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-brand-700">
            horaboa.com{publicPath} <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
          <div className="mt-2.5">
            <CopyButton value={publicPath} label="Copiar link" className="btn-secondary btn-sm w-full" />
          </div>
        </div>
        <SidebarNav />
        <form action={logout} className="mt-auto pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-100">
            <LogOut className="h-[18px] w-[18px]" /> Sair ({user.name.split(" ")[0]})
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Cabeçalho (celular) */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200/80 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/painel" aria-label="Agenda">
            <BrandIcon className="h-8 w-8" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-extrabold leading-tight text-navy-900">{b.name}</p>
            <p className="truncate text-xs text-zinc-500">horaboa.com{publicPath}</p>
          </div>
          <ShareLinkButton value={publicPath} title={b.name} />
        </header>

        <main className="px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto max-w-5xl space-y-3">
            {access.kind === "trial" && (
              <Banner tone="brand" icon={<Clock3 className="h-4 w-4" />} href="/painel/assinatura" action="Assinar">
                Teste grátis: <strong>{access.daysLeft === 1 ? "último dia" : `${access.daysLeft} dias`}</strong>
              </Banner>
            )}
            {access.kind === "grace" && (
              <Banner tone="amber" icon={<AlertTriangle className="h-4 w-4" />} href="/painel/assinatura" action="Regularizar">
                Assinatura vencida. Bloqueio em <strong>{access.daysLeft} dia(s)</strong>.
              </Banner>
            )}
            {whatsappDown && (
              <Banner tone="red" icon={<WifiOff className="h-4 w-4" />} href="/painel/whatsapp" action="Reconectar">
                <strong>WhatsApp desconectado.</strong> Lembretes parados.
              </Banner>
            )}
          </div>
          <div className="mx-auto mt-1 max-w-5xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function Banner({
  tone,
  icon,
  href,
  action,
  children,
}: {
  tone: "brand" | "amber" | "red";
  icon: React.ReactNode;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  const styles = {
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-800",
  }[tone];
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${styles}`}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <Link href={href} className="shrink-0 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold hover:bg-white">
        {action}
      </Link>
    </div>
  );
}
