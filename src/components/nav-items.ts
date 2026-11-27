// Itens do menu do painel (usados no menu lateral, na barra de baixo e na tela Mais)
import {
  CalendarDays,
  CircleHelp,
  ClipboardList,
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
  { href: "/painel/agendamentos", label: "Agendamentos", desc: "Lista, filtros, pagamentos e planilhas", icon: ClipboardList, color: "pn-g-brand" },
  { href: "/painel/profissionais", label: "Gestão de equipe", desc: "Profissionais, horários e serviços", icon: UserRound, color: "pn-g-indigo" },
  { href: "/painel/horarios", label: "Horários de funcionamento", desc: "Dias e horários do estabelecimento", icon: Clock, color: "pn-g-brand" },
  { href: "/painel/bloqueios", label: "Bloqueios de agenda", desc: "Folgas, férias e compromissos", icon: Lock, color: "pn-g-amber" },
  { href: "/painel/pagina", label: "Minha página", desc: "Logo, capa, cor e redes sociais", icon: Palette, color: "pn-g-purple" },
  { href: "/painel/whatsapp", label: "WhatsApp", desc: "Confirmações e lembretes", icon: MessageCircle, color: "pn-g-wa" },
  { href: "/painel/configuracoes", label: "Configurações", desc: "Dados e regras de agendamento", icon: SlidersHorizontal, color: "pn-g-gray" },
  { href: "/painel/assinatura", label: "Assinatura", desc: "Plano e pagamentos", icon: CreditCard, color: "pn-g-teal" },
  { href: "/painel/conta", label: "Minha conta", desc: "Seus dados, senha e privacidade", icon: KeyRound, color: "pn-g-gray" },
  { href: "/painel/suporte", label: "Suporte", desc: "Dúvidas e ajuda", icon: CircleHelp, color: "pn-g-blue" },
];

/** Menu lateral do computador: itens soltos e grupos que abrem (Agenda, Configurações). */
export type NavEntry =
  | { kind: "item"; href: string }
  | { kind: "quick"; label: string; icon: LucideIcon; color: string }
  | { kind: "group"; id: string; label: string; icon: LucideIcon; color: string; children: { href: string; label: string }[] };

export const SIDEBAR: NavEntry[] = [
  {
    kind: "group",
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    color: "pn-g-brand",
    children: [
      { href: "/painel", label: "Calendário" },
      { href: "/painel/agendamentos", label: "Agendamentos" },
      { href: "/painel/bloqueios", label: "Bloqueios de agenda" },
    ],
  },
  { kind: "quick", label: "Novo agendamento", icon: Plus, color: "pn-g-green" },
  { kind: "item", href: "/painel/clientes" },
  { kind: "item", href: "/painel/servicos" },
  { kind: "item", href: "/painel/profissionais" },
  { kind: "item", href: "/painel/pagina" },
  { kind: "item", href: "/painel/whatsapp" },
  {
    kind: "group",
    id: "config",
    label: "Configurações",
    icon: SlidersHorizontal,
    color: "pn-g-gray",
    children: [
      { href: "/painel/configuracoes", label: "Dados e regras" },
      { href: "/painel/horarios", label: "Horários de funcionamento" },
    ],
  },
  { kind: "item", href: "/painel/assinatura" },
  { kind: "item", href: "/painel/conta" },
  { kind: "item", href: "/painel/suporte" },
];
