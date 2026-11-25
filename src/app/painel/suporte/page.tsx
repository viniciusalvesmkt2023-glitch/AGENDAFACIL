import Link from "next/link";
import { CalendarPlus, ChevronRight, Clock, Mail, MessageCircle, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { getAccessState } from "@/lib/subscription";
import { whatsappLink } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

const FAQ = [
  {
    q: "Meus clientes não estão recebendo as mensagens no WhatsApp",
    a: "Abra o menu WhatsApp e veja se aparece “Conectado”. Se estiver desconectado, conecte de novo (por código ou QR code). Confira também se a confirmação e os lembretes estão ligados, e se o telefone do cliente tem DDD.",
  },
  {
    q: "Como meu cliente agenda?",
    a: "Mande o seu link (horaboa.com/seu-link) pelo WhatsApp ou coloque na bio do Instagram. O cliente escolhe o serviço, o profissional e o horário, e o agendamento aparece na sua agenda na hora.",
  },
  {
    q: "Como marco um horário para um cliente que me chamou?",
    a: "Toque no botão + (Novo) na barra de baixo, escolha serviço, dia e horário e preencha o nome e o telefone do cliente.",
  },
  {
    q: "Como cadastro profissionais e horários?",
    a: "Em Mais → Profissionais você cadastra a equipe e escolhe os serviços de cada um. Em Mais → Horários você define os dias e horários de atendimento.",
  },
  {
    q: "Como troco ou cancelo meu plano?",
    a: "Em Mais → Assinatura. No cartão, use “Gerenciar cartão”; no Pix, você pode cancelar a renovação ali mesmo. O acesso continua até o fim do período pago.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Os dados ficam em servidores no Brasil, a conexão é criptografada e sua senha é guardada de forma que nem nós conseguimos ver. Só você acessa os dados do seu estabelecimento.",
  },
];

export default async function SupportPage() {
  const user = await requireUser();
  const b = user.business;
  const supportWhatsapp = process.env.SUPPORT_WHATSAPP;
  const access = getAccessState(b);
  const details = [
    `Estabelecimento: ${b.name} (horaboa.com/${b.slug})`,
    `ID: ${b.id}`,
    `E-mail: ${user.email}`,
    `Assinatura: ${access.kind}${b.plan ? ` · ${b.plan}` : ""}${b.paymentMethod ? ` · ${b.paymentMethod}` : ""}`,
    `WhatsApp: ${b.whatsappStatus}`,
    `Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
  ].join("\n");

  return (
    <>
      <PageHeader title="Suporte" description="Fale com a gente ou tire suas dúvidas." />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <section className="card divide-y divide-zinc-100">
            {supportWhatsapp && (
              <a
                href={whatsappLink(supportWhatsapp, `Olá! Preciso de ajuda com o HoraBoa (${b.name}).`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 active:bg-zinc-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium text-navy-900">WhatsApp</span>
                  <span className="block text-sm text-zinc-500">Fale com a gente agora</span>
                </span>
                <ChevronRight className="h-5 w-5 text-zinc-300" />
              </a>
            )}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Ajuda: ${b.name}`)}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-zinc-50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-50 text-navy-700">
                <Mail className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-navy-900">E-mail</span>
                <span className="block truncate text-sm text-zinc-500">{SUPPORT_EMAIL}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-zinc-300" />
            </a>
          </section>

          <section className="card p-4">
            <h2 className="font-display font-bold">Algo deu errado?</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Copie os detalhes abaixo e envie junto com a sua mensagem. Isso ajuda a gente a resolver mais rápido. Nunca envie sua senha.
            </p>
            <CopyButton value={details} label="Copiar detalhes para o suporte" className="btn-secondary mt-3 w-full" />
          </section>

          <section className="card divide-y divide-zinc-100">
            {[
              { href: "/painel/novo", label: "Novo agendamento", icon: Plus },
              { href: "/painel/horarios", label: "Horários de atendimento", icon: Clock },
              { href: "/painel/whatsapp", label: "WhatsApp e lembretes", icon: MessageCircle },
              { href: "/comecar", label: "Refazer a configuração guiada", icon: CalendarPlus },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy-900 active:bg-zinc-50">
                <Icon className="h-4 w-4 text-zinc-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </Link>
            ))}
          </section>
        </div>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Perguntas frequentes</h2>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-4">
                <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold text-navy-900">
                  <span className="flex-1">{f.q}</span>
                  <Plus className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 transition group-open:rotate-45" />
                </summary>
                <p className="mt-2 text-sm text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
