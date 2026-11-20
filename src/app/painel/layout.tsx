import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { DashboardNav } from "@/components/dashboard-nav";
import { CopyButton } from "@/components/copy-button";
import { logout } from "../(auth)/actions";
import { getAccessState } from "@/lib/subscription";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const publicPath = `/${user.business.slug}`;
  const access = getAccessState(user.business);

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-zinc-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <Logo href="/painel" />
          <div className="flex items-center gap-2 md:hidden">
            <CopyButton value={publicPath} label="Copiar meu link" />
            <form action={logout}>
              <button className="btn-secondary px-3 py-1.5 text-xs">Sair</button>
            </form>
          </div>
        </div>
        <div className="mb-4 hidden rounded-lg bg-zinc-50 p-3 md:block">
          <p className="truncate text-sm font-medium">{user.business.name}</p>
          <p className="mt-1 text-xs text-zinc-500">Seu link de agendamento:</p>
          <Link href={publicPath} target="_blank" className="block truncate text-xs font-medium text-brand-600">
            {publicPath}
          </Link>
          <div className="mt-2">
            <CopyButton value={publicPath} label="Copiar link" />
          </div>
        </div>
        <DashboardNav />
        <form action={logout} className="mt-4 hidden md:block">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100">
            Sair ({user.name.split(" ")[0]})
          </button>
        </form>
      </aside>
      <main className="flex-1 p-4 sm:p-8">
        <div className="mx-auto max-w-5xl">
          {access.kind === "trial" && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span>
                Teste grátis: <strong>{access.daysLeft === 1 ? "último dia" : `${access.daysLeft} dias restantes`}</strong>
              </span>
              <Link href="/painel/assinatura" className="btn-primary px-3 py-1.5 text-xs">Assinar agora</Link>
            </div>
          )}
          {access.kind === "grace" && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>
                Sua assinatura venceu. O acesso será bloqueado em <strong>{access.daysLeft} dia(s)</strong>.
              </span>
              <Link href="/painel/assinatura" className="btn-primary px-3 py-1.5 text-xs">Regularizar</Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
