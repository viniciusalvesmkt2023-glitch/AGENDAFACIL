"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/painel", label: "Agenda" },
  { href: "/painel/novo", label: "Novo agendamento" },
  { href: "/painel/clientes", label: "Clientes" },
  { href: "/painel/servicos", label: "Serviços" },
  { href: "/painel/profissionais", label: "Profissionais" },
  { href: "/painel/horarios", label: "Horários" },
  { href: "/painel/configuracoes", label: "Configurações" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {links.map((l) => {
        const active = l.href === "/painel" ? pathname === "/painel" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
