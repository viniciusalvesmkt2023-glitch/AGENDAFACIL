import "./painel.css";
import Link from "next/link";
import { AlertTriangle, Clock3, ExternalLink, ListChecks, LogOut, WifiOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { BottomNav, SidebarNav } from "@/components/nav";
import { CopyButton, ShareLinkButton } from "@/components/copy-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "../(auth)/actions";
import { getAccessState } from "@/lib/subscription";
import { evolutionConfigured } from "@/lib/evolution";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const b = user.business;
  const publicPath = `/${b.slug}`;
  const access = getAccessState(b);
  const whatsappDown = evolutionConfigured() && b.whatsappConnectedAt && b.whatsappStatus !== "CONNECTED";
  const dark = user.panelTheme === "DARK";
  const logo = b.logoImageId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/i/${b.logoImageId}`} alt="" />
  ) : (
    <span>{b.name.charAt(0).toUpperCase()}</span>
  );

  return (
    <div className={`pn md:flex ${dark ? "pn-dark" : ""}`} data-theme={dark ? "dark" : "light"}>
      <div className="pn-bg" aria-hidden="true">
        <i />
        <i />
      </div>

      {/* Menu lateral (computador) */}
      <aside className="pn-side pn-glass hidden md:sticky md:top-3 md:flex md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:p-3">
        <div className="mb-4 px-1 pt-1">
          <Logo href="/painel" />
        </div>
        <div className="pn-card mb-4 rounded-2xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="pn-ring">{logo}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ color: "var(--pn-fg)" }}>{b.name}</p>
              <Link href={publicPath} target="_blank" className="flex items-center gap-1 truncate text-xs font-medium" style={{ color: "var(--b)" }}>
                <span className="truncate">horaboa.com{publicPath}</span> <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            </div>
          </div>
          <div className="mt-2.5">
            <CopyButton value={publicPath} label="Copiar link" className="btn-secondary btn-sm w-full" />
          </div>
        </div>
        <SidebarNav />
        <div className="mt-auto space-y-1 pt-4">
          <ThemeToggle dark={dark} className="pn-nav-a w-full" withLabel />
          <form action={logout}>
            <button className="pn-nav-a danger w-full">
              <LogOut className="h-[18px] w-[18px]" /> Sair ({user.name.split(" ")[0]})
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Cabeçalho (celular) */}
        <header className="pn-top pn-glass md:hidden">
          <Link href="/painel" aria-label="Agenda" className="pn-ring">
            {logo}
          </Link>
          <div className="pn-top-t">
            <b>{b.name}</b>
            <small>horaboa.com{publicPath}</small>
          </div>
          <ThemeToggle dark={dark} />
          <ShareLinkButton value={publicPath} title={b.name} className="pn-ib brand" />
        </header>

        <main className="px-4 pb-32 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto max-w-5xl space-y-2">
            {!b.onboardedAt && (
              <Banner color="pn-g-brand" icon={<ListChecks />} href={`/comecar?passo=${Math.min(6, b.onboardingStep + 1)}`} action="Continuar">
                <strong>Falta pouco!</strong> Termine de configurar sua agenda.
              </Banner>
            )}
            {access.kind === "trial" && b.onboardedAt && (
              <Banner color="pn-g-teal" icon={<Clock3 />} href="/painel/assinatura" action="Assinar">
                Teste grátis: <strong>{access.daysLeft === 1 ? "último dia" : `${access.daysLeft} dias`}</strong>
              </Banner>
            )}
            {access.kind === "grace" && (
              <Banner color="pn-g-amber" icon={<AlertTriangle />} href="/painel/assinatura" action="Regularizar">
                Assinatura vencida. Bloqueio em <strong>{access.daysLeft} dia(s)</strong>.
              </Banner>
            )}
            {whatsappDown && (
              <Banner color="pn-g-red" icon={<WifiOff />} href="/painel/whatsapp" action="Reconectar">
                <strong>WhatsApp desconectado.</strong> Lembretes parados.
              </Banner>
            )}
          </div>
          <div className="mx-auto mt-2 max-w-5xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function Banner({ color, icon, href, action, children }: { color: string; icon: React.ReactNode; href: string; action: string; children: React.ReactNode }) {
  return (
    <div className="pn-banner pn-glass">
      <span className={`ic ${color}`}>{icon}</span>
      <span className="tx">{children}</span>
      <Link href={href} className={`pn-btn sm ${color}`}>
        {action}
      </Link>
    </div>
  );
}
