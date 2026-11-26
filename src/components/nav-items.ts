// Itens do menu do painel (usados no menu lateral, na barra de baixo e na tela Mais)
import {
  CalendarDays,
  CircleHelp,
  CreditCard,
  KeyRound,
  Lock,
  Palette,
  Clock,
  MessageCircle,
  Plus,
  Scissors,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Item do menu: cada um com seu ícone colorido (gradiente pn-g-*). */
export type MenuItem = { href: string; label: string; desc: string; icon: LucideIcon; color: string };

export const NAV_ITEMS: MenuItem[] = [
  { href: "/painel", label: "Agenda", desc: "Seus horários do dia", icon: CalendarDays, color: "pn-g-brand" },
  { href: "/painel/novo", label: "Novo agendamento", desc: "Marcar um horário", icon: Plus, color: "pn-g-green" },
  { href: "/painel/clientes", label: "Clientes", desc: "Quem já agendou", icon: Users, color: "pn-g-blue" },
  { href: "/painel/servicos", label: "Serviços", desc: "O que você oferece", icon: Scissors, color: "pn-g-pink" },
  { href: "/painel/profissionais", label: "Profissionais", desc: "Equipe e serviços de cada um", icon: UserRound, color: "pn-g-indigo" },
  { href: "/painel/horarios", label: "Horários", desc: "Dias e horários de funcionamento", icon: Clock, color: "pn-g-brand" },
  { href: "/painel/bloqueios", label: "Bloqueios", desc: "Folgas, férias e compromissos", icon: Lock, color: "pn-g-amber" },
  { href: "/painel/pagina", label: "Minha página", desc: "Logo, capa, cor e redes sociais", icon: Palette, color: "pn-g-purple" },
  { href: "/painel/whatsapp", label: "WhatsApp", desc: "Confirmações e lembretes", icon: MessageCircle, color: "pn-g-wa" },
  { href: "/painel/configuracoes", label: "Configurações", desc: "Dados e regras de agendamento", icon: SlidersHorizontal, color: "pn-g-gray" },
  { href: "/painel/assinatura", label: "Assinatura", desc: "Plano e pagamentos", icon: CreditCard, color: "pn-g-teal" },
  { href: "/painel/conta", label: "Minha conta", desc: "Seus dados, senha e privacidade", icon: KeyRound, color: "pn-g-gray" },
  { href: "/painel/suporte", label: "Suporte", desc: "Dúvidas e ajuda", icon: CircleHelp, color: "pn-g-blue" },
];
