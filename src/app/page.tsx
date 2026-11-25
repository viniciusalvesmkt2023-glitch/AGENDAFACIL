import Link from "next/link";
import {
  BellRing,
  CalendarCheck2,
  Check,
  CreditCard,
  Link2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { Logo, Wordmark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { monthlyEquivalentCents, PLAN_LIST, TRIAL_DAYS } from "@/lib/plans";

const features = [
  { icon: Link2, title: "Seu link de agendamento", text: "Clientes escolhem serviço, profissional e horário 24h por dia, sem precisar te chamar." },
  { icon: BellRing, title: "Lembretes no WhatsApp", text: "Confirmação e lembrete automáticos, enviados do seu próprio número. Menos faltas." },
  { icon: CalendarCheck2, title: "Sem conflito de horários", text: "Considera a duração de cada serviço, o almoço e a agenda de cada profissional." },
  { icon: Smartphone, title: "Feito para o celular", text: "Veja o dia, confirme, conclua e marque faltas com um toque, entre um cliente e outro." },
  { icon: Users, title: "Equipe e clientes", text: "Cadastre a equipe e tenha o histórico de cada cliente montado automaticamente." },
  { icon: CreditCard, title: "Pix ou cartão", text: "Assine no cartão ou no Pix com renovação automática. Cancele quando quiser." },
];

const steps = [
  { n: "1", title: "Cadastre seus serviços", text: "Preço, duração e quem faz cada um. Leva 5 minutos." },
  { n: "2", title: "Compartilhe seu link", text: "Coloque na bio do Instagram e mande no WhatsApp." },
  { n: "3", title: "Receba os agendamentos", text: "A agenda se organiza sozinha e o cliente recebe o lembrete." },
];

const preview = [
  { time: "09:00", name: "João Silva", service: "Corte + barba", status: "Confirmado", tone: "bg-emerald-50 text-emerald-700" },
  { time: "10:00", name: "Pedro Santos", service: "Corte masculino", status: "Agendado", tone: "bg-blue-50 text-blue-700" },
  { time: "11:30", name: "Lucas Oliveira", service: "Barba", status: "Agendado", tone: "bg-blue-50 text-blue-700" },
];

export default function Home() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/entrar" className="rounded-xl px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-zinc-50">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary btn-sm sm:min-h-10 sm:px-4 sm:text-sm">
              Testar grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-navy-50/60 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-20">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              <ShieldCheck className="h-4 w-4" /> {TRIAL_DAYS} dias grátis · sem cartão
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Sua agenda cheia, <span className="text-brand-500">sem esforço</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-zinc-600 md:mx-0">
              Agendamento online para barbearias e salões. Seus clientes marcam sozinhos e recebem lembrete no WhatsApp.
              Você só atende.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link href="/cadastro" className="btn-primary min-h-12 px-6 text-base">
                Começar meus {TRIAL_DAYS} dias grátis
              </Link>
              <a href="#como-funciona" className="btn-secondary min-h-12 px-6 text-base">
                Como funciona
              </a>
            </div>
          </div>

          {/* Prévia do app no celular */}
          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-brand-500/10 blur-2xl" />
            <div className="rounded-[2.5rem] border-[10px] border-navy-900 bg-[#f6f7fb] p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="font-display text-lg font-extrabold text-navy-900">Agenda</p>
                  <p className="text-xs text-zinc-500">Hoje · 3 agendamentos</p>
                </div>
                <span className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-bold text-white">+ Novo</span>
              </div>
              <div className="space-y-2">
                {preview.map((p) => (
                  <div key={p.time} className="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2.5">
                    <p className="w-11 font-display font-extrabold text-navy-900">{p.time}</p>
                    <div className="min-w-0 flex-1 border-l border-zinc-100 pl-2">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-sm font-semibold text-navy-900">{p.name}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${p.tone}`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-zinc-500">{p.service}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  <MessageCircle className="h-4 w-4 shrink-0" /> Lembrete enviado para Pedro (WhatsApp)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold">Como funciona</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 font-display text-lg font-extrabold text-white">{s.n}</span>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{s.title}</h3>
              <p className="mt-1 text-zinc-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="bg-[#f6f7fb] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold">Tudo o que seu salão precisa</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{title}</h3>
                <p className="mt-1 text-zinc-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold">Preço simples</h2>
        <p className="mt-2 text-center text-zinc-600">Todos os recursos em todos os planos. {TRIAL_DAYS} dias grátis para testar.</p>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 pt-2 md:grid-cols-3">
          {PLAN_LIST.map((p) => {
            const best = p.id === "ANNUAL";
            return (
              <div key={p.id} className={`relative rounded-3xl border-2 bg-white p-6 ${best ? "border-brand-500 shadow-xl shadow-brand-500/10" : "border-zinc-200"}`}>
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">{p.highlight}</span>
                )}
                <p className="font-display text-lg font-bold text-navy-900">{p.name}</p>
                <p className="mt-2">
                  <span className="font-display text-4xl font-extrabold text-navy-900">{formatMoney(monthlyEquivalentCents(p))}</span>
                  <span className="text-zinc-500">/mês</span>
                </p>
                <p className="mt-1 text-sm text-zinc-500">{p.months === 1 ? "cobrado mensalmente" : `${formatMoney(p.priceCents)} a cada ${p.months} meses`}</p>
                <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                  {["Agendamentos ilimitados", "Lembretes no WhatsApp", "Pix ou cartão"].map((f) => (
                    <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> {f}</li>
                  ))}
                </ul>
                <Link href="/cadastro" className={`${best ? "btn-primary" : "btn-secondary"} mt-6 w-full`}>Começar grátis</Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chamada final */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-navy-900 px-6 py-12 text-center text-white sm:px-12">
          <p className="font-display text-3xl font-extrabold sm:text-4xl">Pronto para encher sua agenda?</p>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Crie sua conta em 2 minutos e comece a receber agendamentos hoje mesmo.</p>
          <Link href="/cadastro" className="btn-primary mt-8 min-h-12 px-8 text-base">Testar grátis por {TRIAL_DAYS} dias</Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <Wordmark className="text-lg" />
          <p>
            © {new Date().getFullYear()} HoraBoa ·{" "}
            <Link href="/termos" className="hover:underline">Termos</Link> ·{" "}
            <Link href="/privacidade" className="hover:underline">Privacidade</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
