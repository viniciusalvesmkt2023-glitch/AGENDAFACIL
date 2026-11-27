import "./vendas.css";
import {
  Bell,
  Check,
  CirclePlay,
  Clock,
  Image as ImageIcon,
  LockOpen,
  Palette,
  Pencil,
  RefreshCw,
  Smartphone,
  Zap,
} from "lucide-react";
import { RevealOnScroll } from "@/components/landing/reveal";
import { LandingHeader } from "@/components/landing/header";
import { Cta } from "@/components/landing/cta";
import { HeroDemo } from "@/components/landing/hero-demo";
import { PageEditorDemo } from "@/components/landing/page-editor-demo";
import { WhatsAppDemo } from "@/components/landing/whatsapp-demo";
import { FeaturesBento } from "@/components/landing/features-bento";
import { Pricing, type PricingPlan } from "@/components/landing/pricing";
import { Faq, type FaqItem } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { formatMoney, whatsappLink } from "@/lib/format";
import { discountPercent, monthlyEquivalentCents, PLANS, TRIAL_DAYS, type Plan } from "@/lib/plans";

const HEADLINE_ENDINGS = ["sem esforço.", "sem estresse.", "sem bagunça.", "sem perder clientes."];

const TYPES = [
  ["💈", "Barbearias"],
  ["💇‍♀️", "Salões de beleza"],
  ["💅", "Manicure e pedicure"],
  ["👁️", "Sobrancelhas e cílios"],
  ["🧖‍♀️", "Estética e spa"],
  ["🩺", "Clínicas"],
];


const FAQ: FaqItem[] = [
  { cat: "plano", color: "fq-g-green", icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', q: "Preciso de cartão para testar?",
    a: <><b>Não.</b> Você usa tudo por {TRIAL_DAYS} dias grátis e só assina se gostar. Sem cartão e sem compromisso.</> },
  { cat: "whats", color: "fq-g-wa", icon: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', q: "As mensagens saem de qual WhatsApp?",
    a: <>Do <b>seu próprio número</b>. Você conecta o WhatsApp do negócio em poucos passos (QR code ou código) e o cliente responde direto para você.</> },
  { cat: "whats", color: "fq-g-amber", icon: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', q: "Posso escolher quando os lembretes são enviados?",
    a: <>Pode. Você escolhe o lembrete da <b>véspera ou 24h antes</b> e outro <b>perto do horário</b>, edita o texto das mensagens e pausa quando quiser.</> },
  { cat: "uso", color: "fq-g-blue", icon: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>', q: "Meu cliente precisa baixar algum aplicativo?",
    a: <><b>Não.</b> Ele abre o seu link, escolhe o horário e pronto. Funciona em qualquer celular ou computador.</> },
  { cat: "uso", color: "fq-g-purple", icon: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>', q: "O cliente consegue remarcar ou cancelar sozinho?",
    a: <>Sim, pelo link da confirmação — e só dentro das <b>regras que você definir</b> (por exemplo, até algumas horas antes do horário).</> },
  { cat: "uso", color: "fq-g-indigo", icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', q: "Funciona para quem trabalha sozinho?",
    a: <>Sim! Funciona para quem atende sozinho e para equipes, com <b>horários próprios para cada profissional</b>.</> },
  { cat: "plano", color: "fq-g-brand", icon: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>', q: "Posso cancelar quando quiser?",
    a: <>Pode. <b>Não tem fidelidade nem multa</b>: é só cancelar no painel.</> },
  { cat: "plano", color: "fq-g-teal", icon: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>', q: "Meus dados e os dos clientes ficam seguros?",
    a: <>Sim. Seguimos a <b>LGPD</b>: os dados são usados só para os agendamentos, e você pode excluir sua conta quando quiser.</> },
];


const brl = (cents: number) => formatMoney(cents);
/** Dados dos planos para a seção de preços (tudo calculado a partir de lib/plans). */
function pricingPlans(): PricingPlan[] {
  const monthly = PLANS.MONTHLY;
  return [PLANS.MONTHLY, PLANS.SEMIANNUAL, PLANS.ANNUAL].map((p) => {
    const perMonth = monthlyEquivalentCents(p);
    const saved = monthly.priceCents * p.months - p.priceCents;
    const period = p.months === 12 ? "por ano" : p.months === 6 ? "por semestre" : "";
    return {
      id: p.id,
      name: p.name,
      short: p.name,
      price: brl(perMonth).replace("R$", "").trim(),
      old: p.id === "MONTHLY" ? "" : `${brl(monthly.priceCents)}/mês`,
      save: saved > 0 ? `Economize ${brl(saved)} ${period}`.trim() : "",
      bill: p.months === 1 ? "cobrado todo mês" : `${brl(p.priceCents)} cobrado a cada ${p.months} meses`,
      day: `${brl(Math.round(perMonth / 30))} por dia`,
      off: discountPercent(p),
    };
  });
}

export default async function Home({ searchParams }: { searchParams: Promise<{ conta?: string }> }) {
  const deleted = (await searchParams).conta === "excluida";
  // WhatsApp do suporte (opcional): sem ele, só aparece o e-mail
  const supportWhatsapp = process.env.SUPPORT_WHATSAPP ? whatsappLink(process.env.SUPPORT_WHATSAPP, "Olá! Tenho uma dúvida sobre o HoraBoa.") : null;
  return (
    <div className="lp">
      <RevealOnScroll />
      <div className="lp-bg" aria-hidden="true">
        <i />
        <i />
      </div>
      {deleted && (
        <p className="bg-navy-900 px-4 py-2.5 text-center text-sm text-white">Sua conta foi excluída. Obrigado por ter usado o HoraBoa.</p>
      )}

      <LandingHeader />

      {/* Abertura */}
      <section className="hero">
        <div className="lp-wrap">
          <span className="badge lp-glass">
            <span className="dot g-green"><Check className="i" /></span> {TRIAL_DAYS} dias grátis · sem cartão de crédito
          </span>
          <h1 className="lp-disp">
            Sua agenda cheia,
            <br />
            <span className="sr-only">sem esforço.</span>
            {/* Final do título trocando sozinho (o primeiro se repete no fim para o loop não "pular") */}
            <em className="lp-rot" aria-hidden="true">
              {[...HEADLINE_ENDINGS, HEADLINE_ENDINGS[0]].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </em>
          </h1>
          <p className="sub">
            O cliente agenda sozinho pelo seu link, recebe confirmação e lembrete no seu WhatsApp, e você só atende. Para barbearias,
            salões, manicures, estética e mais.
          </p>
          <div className="ctas">
            <Cta href="/cadastro">Começar meus {TRIAL_DAYS} dias grátis</Cta>
            <a className="lp-btn ghost lp-shape" href="#como">
              <CirclePlay className="i" /> Ver como funciona
            </a>
          </div>
          <div className="lp-perks">
            <span><Zap className="i" /> Pronto em 5 minutos</span>
            <span><LockOpen className="i" /> Sem fidelidade</span>
            <span><Smartphone className="i" /> Feito para o celular</span>
          </div>

          <HeroDemo />
        </div>
      </section>

      {/* Para quem é: faixa laranja passando em loop */}
      <section className="lp-band" aria-label="Feito para quem trabalha com horário marcado">
        <div className="lp-band-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="lp-band-group" aria-hidden={copy === 1 ? true : undefined}>
              {[...TYPES, ...TYPES].map(([emoji, label], i) => (
                <span key={`${label}-${i}`}>
                  <i>{emoji}</i>
                  {label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="blk lp-center" id="como">
        <div className="lp-wrap">
          <span className="eyebrow">Como funciona</span>
          <h2 className="lp-disp">Comece a receber agendamentos <em>hoje</em></h2>
          <p className="lead">Sem instalar nada. Você configura pelo celular e já sai com o seu link pronto para divulgar.</p>
          <div className="steps">
            {[
              ["g-brand", "Cadastre seus serviços", "Preço, duração, foto e quem faz cada um. Leva uns 5 minutos."],
              ["g-purple", "Compartilhe seu link", "horaboa.com/seunegocio na bio do Instagram, no status e no WhatsApp."],
              ["g-green", "Receba e atenda", "A agenda se organiza sozinha e o cliente recebe confirmação e lembrete."],
            ].map(([color, title, text], i) => (
              <div key={title} className="step lp-glass lp-rv">
                <span className="big lp-disp">{i + 1}</span>
                <span className={`n ${color} lp-disp`}>{i + 1}</span>
                <h3 className="lp-disp">{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sua página */}
      <section className="blk">
        <div className="lp-wrap split">
          <div className="lp-rv">
            <span className="eyebrow">Sua página de agendamento</span>
            <h2 className="lp-disp">Um link com a <em>cara do seu negócio</em></h2>
            <p className="lead">O cliente escolhe o serviço, o profissional e o horário em poucos toques — e só vê horários realmente livres.</p>
            <ul className="checks" id="lp-checks-pagina">
              <CheckItem k="marca" icon={<Palette className="i" />} color="g-purple" title="Sua marca:" text="logo, capa, cores, desenhos de fundo e modo claro ou escuro." />
              <CheckItem k="fotos" icon={<ImageIcon className="i" />} color="g-pink" title="Fotos dos serviços" text="para o cliente ver o que está agendando." />
              <CheckItem icon={<Clock className="i" />} color="g-blue" title="Sem conflito:" text="respeita a duração de cada serviço, almoço, folgas e a agenda de cada profissional." />
              <CheckItem icon={<RefreshCw className="i" />} color="g-green" title="O cliente troca ou cancela sozinho," text="dentro das regras que você definir." />
            </ul>
          </div>
          <div className="showcase lp-glass lp-rv">
            <div className="bgd" />
            <PageEditorDemo listId="lp-checks-pagina" />
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="blk">
        <div className="lp-wrap split rev">
          <div className="lp-rv">
            <span className="eyebrow">WhatsApp automático</span>
            <h2 className="lp-disp">Menos faltas, <em>sem você digitar nada</em></h2>
            <p className="lead">
              As mensagens saem do <b>seu próprio número</b>. O cliente responde direto para você, como sempre.
            </p>
            <ul className="checks" id="lp-checks-whats">
              <CheckItem k="conf" icon={<Check className="i" />} color="g-wa" title="Confirmação na hora" text="com o dia, o horário, o serviço e o link para trocar ou cancelar." />
              <CheckItem k="lemb" icon={<Bell className="i" />} color="g-amber" title="Lembretes no momento certo:" text="na véspera ou 24h antes, e de novo perto do horário." />
              <CheckItem icon={<Pencil className="i" />} color="g-indigo" title="Mensagens do seu jeito:" text="você edita o texto, escolhe quando enviar e pode pausar quando quiser." />
            </ul>
          </div>
          <div className="showcase dark lp-rv">
            <div className="bgd" />
            <WhatsAppDemo listId="lp-checks-whats" />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="blk lp-center">
        <div className="lp-wrap">
          <span className="eyebrow">Tudo em um só lugar</span>
          <h2 className="lp-disp">Tudo o que seu negócio precisa</h2>
          <p className="lead">Cada recurso com uma mini demonstração de como ele aparece no seu painel.</p>
          <div style={{ textAlign: "left", marginTop: 40 }}>
            <FeaturesBento />
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="blk lp-center" id="precos">
        <div className="lp-wrap">
          <span className="eyebrow">Preços</span>
          <h2 className="lp-disp">Preço simples, <em>sem surpresa</em></h2>
          <p className="lead">Todos os recursos em todos os planos. Teste {TRIAL_DAYS} dias grátis, sem cartão.</p>
          <Pricing plans={pricingPlans()} trialDays={TRIAL_DAYS} initial="ANNUAL" />
        </div>
      </section>

      {/* Perguntas */}
      <section className="blk">
        <div className="lp-wrap">
          <Faq items={FAQ} trialDays={TRIAL_DAYS} whatsappHref={supportWhatsapp} email={SUPPORT_EMAIL} />
        </div>
      </section>

      {/* Chamada final e rodapé */}
      <div className="lp-wrap">
        <FinalCta trialDays={TRIAL_DAYS} year={new Date().getFullYear()} />
      </div>
    </div>
  );
}

function CheckItem({ k, icon, color, title, text }: { k?: string; icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <li data-k={k}>
      <span className={`ic ${color}`}>{icon}</span>
      <div>
        <b>{title}</b> <span>{text}</span>
      </div>
    </li>
  );
}

