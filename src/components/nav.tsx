"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_ITEMS, SIDEBAR } from "./nav-items";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Menu, Plus, Scissors, Users, type LucideIcon } from "lucide-react";
import { openQuickBook } from "./quick-book-trigger";

function isActive(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

/** Menu lateral (computador): Agenda e Configurações abrem com as opções de dentro. */
export function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR.flatMap((e) => (e.kind === "group" ? [[e.id, e.id === "agenda" || e.children.some((c) => isActive(pathname, c.href))]] : []))),
  );
  return (
    <nav className="space-y-0.5">
      {SIDEBAR.map((e) => {
        if (e.kind === "item") {
          const item = NAV_ITEMS.find((i) => i.href === e.href)!;
          const Icon = item.icon;
          return (
            <Link key={e.href} href={e.href} className={`pn-nav-a ${isActive(pathname, e.href) ? "on" : ""}`}>
              <span className={`ic ${item.color}`}>
                <Icon />
              </span>
              {item.label}
            </Link>
          );
        }
        const Icon = e.icon;
        if (e.kind === "quick") {
          return (
            <button key="quick" type="button" className="pn-nav-a w-full" onClick={() => openQuickBook()} data-testid="nav-quick">
              <span className={`ic ${e.color}`}>
                <Icon />
              </span>
              {e.label}
            </button>
          );
        }
        const childActive = e.children.some((c) => isActive(pathname, c.href));
        const isOpen = open[e.id] ?? false;
        return (
          <div key={e.id}>
            <button
              type="button"
              className={`pn-nav-a w-full ${childActive && !isOpen ? "on" : ""}`}
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [e.id]: !isOpen }))}
            >
              <span className={`ic ${e.color}`}>
                <Icon />
              </span>
              {e.label}
              <ChevronRight className={`pn-nav-chev ${isOpen ? "open" : ""}`} />
            </button>
            {isOpen && (
              <div className="pn-nav-sub">
                {e.children.map((c) => {
                  // "Calendário" (/painel) só fica marcado na própria agenda
                  // o item mais específico ganha (Catálogo não fica marcado dentro de Controle de estoque)
                  const on =
                    c.href === "/painel"
                      ? pathname === "/painel"
                      : pathname.startsWith(c.href) && !e.children.some((o) => o.href !== c.href && o.href.startsWith(c.href) && pathname.startsWith(o.href));
                  return (
                    <Link key={c.href} href={c.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const MORE_PATHS = [
  "/painel/pagina",
  "/painel/profissionais",
  "/painel/horarios",
  "/painel/bloqueios",
  "/painel/agendamentos",
  "/painel/produtos",
  "/painel/financas",
  "/painel/whatsapp",
  "/painel/configuracoes",
  "/painel/assinatura",
  "/painel/conta",
  "/painel/suporte",
  "/painel/mais",
];

/** Barra de navegação fixa embaixo (celular): vidro flutuante com o + no meio (Agendamento rápido). */
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
      <button type="button" className="pn-tab" aria-label="Agendamento rápido" onClick={() => openQuickBook()} data-testid="fab-quick">
        <span className="pn-fab">
          <Plus strokeWidth={2.6} />
        </span>
      </button>
      {tab("/painel/servicos", "Serviços", Scissors, pathname.startsWith("/painel/servicos"))}
      {tab("/painel/mais", "Mais", Menu, MORE_PATHS.some((p) => pathname.startsWith(p)))}
    </nav>
  );
}
