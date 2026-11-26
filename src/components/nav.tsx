"use client";

import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, Plus, Scissors, Users, type LucideIcon } from "lucide-react";

function isActive(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

/** Menu lateral (computador). */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => (
        <Link key={href} href={href} className={`pn-nav-a ${isActive(pathname, href) ? "on" : ""}`}>
          <span className={`ic ${color}`}>
            <Icon />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

const MORE_PATHS = ["/painel/pagina", "/painel/profissionais", "/painel/horarios", "/painel/bloqueios", "/painel/whatsapp", "/painel/configuracoes", "/painel/assinatura", "/painel/conta", "/painel/suporte", "/painel/mais"];

/** Barra de navegação fixa embaixo (celular): vidro flutuante com o + no meio. */
export function BottomNav() {
  const pathname = usePathname();
  const tab = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link href={href} className={`pn-tab ${active ? "on" : ""}`} aria-current={active ? "page" : undefined}>
      <Icon strokeWidth={active ? 2.4 : 1.9} />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
  return (
    <nav className="pn-tabs pn-glass md:hidden" aria-label="Navegação principal">
      {tab("/painel", "Agenda", CalendarDays, pathname === "/painel")}
      {tab("/painel/clientes", "Clientes", Users, pathname.startsWith("/painel/clientes"))}
      <Link href="/painel/novo" className="pn-tab" aria-label="Novo agendamento">
        <span className="pn-fab">
          <Plus strokeWidth={2.6} />
        </span>
      </Link>
      {tab("/painel/servicos", "Serviços", Scissors, pathname.startsWith("/painel/servicos"))}
      {tab("/painel/mais", "Mais", Menu, MORE_PATHS.some((p) => pathname.startsWith(p)))}
    </nav>
  );
}
