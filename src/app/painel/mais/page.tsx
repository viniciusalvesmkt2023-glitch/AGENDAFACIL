import Link from "next/link";
import { ChevronRight, CircleHelp, CreditCard, Clock, ExternalLink, KeyRound, LogOut, MessageCircle, Settings, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "../../(auth)/actions";
import { ShareLinkButton } from "@/components/copy-button";

const ITEMS = [
  { href: "/painel/profissionais", label: "Profissionais", desc: "Equipe e serviços de cada um", icon: UserRound },
  { href: "/painel/horarios", label: "Horários", desc: "Dias e horários de funcionamento", icon: Clock },
  { href: "/painel/whatsapp", label: "WhatsApp", desc: "Conexão, confirmações e lembretes", icon: MessageCircle },
  { href: "/painel/configuracoes", label: "Configurações", desc: "Dados do salão e regras de agendamento", icon: Settings },
  { href: "/painel/assinatura", label: "Assinatura", desc: "Plano e pagamentos", icon: CreditCard },
  { href: "/painel/conta", label: "Minha conta", desc: "Seus dados, senha e privacidade", icon: KeyRound },
  { href: "/painel/suporte", label: "Suporte", desc: "Dúvidas e ajuda", icon: CircleHelp },
];

export default async function MorePage() {
  const user = await requireUser();
  const publicPath = `/${user.business.slug}`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mais</h1>

      <div className="card p-4">
        <p className="text-sm font-medium text-zinc-500">Seu link de agendamento</p>
        <p className="mt-0.5 truncate font-display text-lg font-bold text-navy-900">horaboa.com{publicPath}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ShareLinkButton value={publicPath} title={user.business.name} className="btn-primary" label="Compartilhar" />
          <Link href={publicPath} target="_blank" className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> Ver página
          </Link>
        </div>
      </div>

      <ul className="card divide-y divide-zinc-100 overflow-hidden">
        {ITEMS.map(({ href, label, desc, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-zinc-50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-navy-900">{label}</span>
                <span className="block truncate text-sm text-zinc-500">{desc}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-zinc-300" />
            </Link>
          </li>
        ))}
      </ul>

      <form action={logout}>
        <button className="btn-secondary w-full text-red-600">
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </form>
    </div>
  );
}
