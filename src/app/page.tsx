import Link from "next/link";
import { Logo } from "@/components/ui";

const features = [
  {
    title: "Link de agendamento próprio",
    text: "Seus clientes escolhem serviço, profissional e horário 24h por dia, sem precisar te chamar no WhatsApp.",
  },
  {
    title: "Sem conflito de horários",
    text: "A agenda considera duração de cada serviço, intervalo de almoço e horários já ocupados por profissional.",
  },
  {
    title: "Agenda do dia na palma da mão",
    text: "Veja todos os atendimentos, confirme, marque faltas e conclua com um clique.",
  },
  {
    title: "Confirmação pelo WhatsApp",
    text: "Envie a confirmação ou lembrete ao cliente com uma mensagem pronta, direto do painel.",
  },
  {
    title: "Equipe e serviços",
    text: "Cadastre profissionais, defina quais serviços cada um faz, preços e duração.",
  },
  {
    title: "Base de clientes",
    text: "Histórico de visitas de cada cliente montado automaticamente a cada agendamento.",
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/entrar" className="btn-secondary">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary">
            Criar conta grátis
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          Para barbearias, salões e clínicas
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
          Sua agenda cheia, <span className="text-brand-600">sem esforço</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
          Pare de perder tempo marcando horário pelo WhatsApp. Com o AgendaFácil seus clientes agendam sozinhos
          e você controla tudo em um só lugar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/cadastro" className="btn-primary px-6 py-3 text-base">
            Começar agora
          </Link>
          <Link href="/entrar" className="btn-secondary px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} AgendaFácil
      </footer>
    </div>
  );
}
