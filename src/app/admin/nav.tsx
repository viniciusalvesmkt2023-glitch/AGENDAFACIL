"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, CreditCard, GraduationCap, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; short: string; icon: LucideIcon; color: string }[] = [
  { href: "/admin", label: "Visão geral", short: "Geral", icon: ChartLine, color: "ad-g-brand" },
  { href: "/admin/clientes", label: "Clientes", short: "Clientes", icon: Users, color: "ad-g-blue" },
  { href: "/admin/pagamentos", label: "Pagamentos", short: "Pagamentos", icon: CreditCard, color: "ad-g-green" },
  { href: "/admin/aulas", label: "Aulas", short: "Aulas", icon: GraduationCap, color: "ad-g-purple" },
  { href: "/admin/configuracoes", label: "Configurações", short: "Config.", icon: SlidersHorizontal, color: "ad-g-gray" },
];
const active = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

export function AdminSideNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <>
      {ITEMS.map(({ href, label, icon: Icon, color }) => (
        <Link key={href} href={href} className={`ad-nav ${active(path, href) ? "on" : ""}`} aria-current={active(path, href) ? "page" : undefined}>
          <span className={`ad-ic ${color}`}><Icon /></span>
          {label}
          {href === "/admin/pagamentos" && pending > 0 && <small title="Pix aguardando pagamento">{pending}</small>}
        </Link>
      ))}
    </>
  );
}

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="ad-tabs-m" aria-label="Menu do admin">
      {ITEMS.map(({ href, short, icon: Icon }) => (
        <Link key={href} href={href} className={active(path, href) ? "on" : ""}>
          <Icon />
          {short}
        </Link>
      ))}
    </nav>
  );
}
