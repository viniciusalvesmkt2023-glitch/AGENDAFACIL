import Link from "next/link";
import { requireActiveUser } from "@/lib/auth";
import { Logo } from "@/components/ui";

export const metadata = { title: "Configure sua agenda" };

// Tela focada (sem o menu do painel) para a configuração inicial
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireActiveUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Logo href="/painel" />
          <Link href="/painel" className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-500 hover:bg-zinc-100">
            Configurar depois
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-36 pt-5 md:pb-16">{children}</main>
    </div>
  );
}
