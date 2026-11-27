import Link from "next/link";
import { ChevronRight, ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { logout } from "../../(auth)/actions";
import { ShareLinkButton } from "@/components/copy-button";
import { NAV_ITEMS } from "@/components/nav-items";
import { getAccessState } from "@/lib/subscription";

// Itens do menu em grupos (os da barra de baixo não se repetem aqui)
const GROUPS = [
  ["/painel/agendamentos", "/painel/bloqueios"],
  ["/painel/produtos", "/painel/produtos/estoque"],
  ["/painel/pagina", "/painel/profissionais", "/painel/horarios"],
  ["/painel/whatsapp", "/painel/configuracoes", "/painel/assinatura"],
  ["/painel/conta", "/painel/suporte"],
];

export default async function MorePage() {
  const user = await requireUser();
  const b = user.business;
  const publicPath = `/${b.slug}`;
  const access = getAccessState(b);

  // Etiquetas de situação ao lado de alguns itens
  const tags: Record<string, { text: string; tone: "" | "ok" | "bad" } | undefined> = {
    "/painel/whatsapp": b.whatsappStatus === "CONNECTED" ? { text: "Conectado", tone: "ok" } : b.whatsappConnectedAt ? { text: "Desconectado", tone: "bad" } : undefined,
    "/painel/assinatura":
      access.kind === "trial"
        ? { text: access.daysLeft === 1 ? "Último dia grátis" : `${access.daysLeft} dias grátis`, tone: "" }
        : access.kind === "grace" || access.kind === "blocked"
          ? { text: "Vencida", tone: "bad" }
          : access.kind === "active"
            ? { text: "Ativa", tone: "ok" }
            : undefined,
  };

  return (
    <div className="space-y-3">
      <h1 className="pn-h1 pt-1">Mais</h1>

      <div className="pn-link pn-card">
        <small>Seu link de agendamento</small>
        <b>
          horaboa.com/<span>{b.slug}</span>
        </b>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <ShareLinkButton value={publicPath} title={b.name} className="pn-btn pn-g-green" label="Compartilhar" />
          <Link href={publicPath} target="_blank" className="pn-btn pn-g-blue">
            <ExternalLink /> Ver página
          </Link>
        </div>
      </div>

      {isAdminEmail(user.email) && (
        <ul className="pn-group pn-card">
          <li>
            <Link href="/admin" className="pn-row" data-testid="link-admin">
              <span className="ic pn-g-navy">
                <ShieldCheck />
              </span>
              <span className="tx">
                <b>Painel admin</b>
                <small>Clientes, vendas e pagamentos</small>
              </span>
              <ChevronRight className="chev" />
            </Link>
          </li>
        </ul>
      )}

      {GROUPS.map((group, gi) => (
        <ul key={gi} className="pn-group pn-card">
          {group.map((href) => {
            const item = NAV_ITEMS.find((i) => i.href === href)!;
            const Icon = item.icon;
            const tag = tags[href];
            return (
              <li key={href}>
                <Link href={href} className="pn-row">
                  <span className={`ic ${item.color}`}>
                    <Icon />
                  </span>
                  <span className="tx">
                    <b>{item.label}</b>
                    <small>{item.desc}</small>
                  </span>
                  {tag ? <span className={`pn-tag ${tag.tone}`}>{tag.text}</span> : <ChevronRight className="chev" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}

      <form action={logout}>
        <button className="pn-btn soft w-full text-red-600" style={{ color: "#ef4444" }}>
          <LogOut /> Sair da conta
        </button>
      </form>
    </div>
  );
}
