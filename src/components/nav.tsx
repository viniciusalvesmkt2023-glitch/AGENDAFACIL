"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  KeyRound,
  Clock,
  Menu,
  MessageCircle,
  Plus,
  Scissors,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: Item[] = [
  { href: "/painel", label: "Agenda", icon: CalendarDays },
  { href: "/painel/novo", label: "Novo agendamento", icon: Plus },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
  { href: "/painel/servicos", label: "Serviços", icon: Scissors },
  { href: "/painel/profissionais", label: "Profissionais", icon: UserRound },
  { href: "/painel/horarios", label: "Horários", icon: Clock },
  { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
  { href: "/painel/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/painel/conta", label: "Minha conta", icon: KeyRound },
  { href: "/painel/suporte", label: "Suporte", icon: CircleHelp },
];

function isActive(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

/** Menu lateral (computador). */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-navy-900"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${active ? "text-brand-600" : "text-zinc-400"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const MORE_PATHS = ["/painel/profissionais", "/painel/horarios", "/painel/whatsapp", "/painel/configuracoes", "/painel/assinatura", "/painel/conta", "/painel/suporte", "/painel/mais"];

/** Barra de navegação fixa embaixo (celular). */
export function BottomNav() {
  const pathname = usePathname();
  const tab = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${
        active ? "text-brand-700" : "text-zinc-500"
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? "text-brand-600" : ""}`} strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </Link>
  );
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-end">
        {tab("/painel", "Agenda", CalendarDays, pathname === "/painel")}
        {tab("/painel/clientes", "Clientes", Users, pathname.startsWith("/painel/clientes"))}
        <Link href="/painel/novo" className="flex flex-1 flex-col items-center pb-1.5" aria-label="Novo agendamento">
          <span className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white">
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <span className={`mt-0.5 text-[11px] font-medium ${pathname.startsWith("/painel/novo") ? "text-brand-700" : "text-zinc-500"}`}>
            Novo
          </span>
        </Link>
        {tab("/painel/servicos", "Serviços", Scissors, pathname.startsWith("/painel/servicos"))}
        {tab("/painel/mais", "Mais", Menu, MORE_PATHS.some((p) => pathname.startsWith(p)))}
      </div>
    </nav>
  );
}
