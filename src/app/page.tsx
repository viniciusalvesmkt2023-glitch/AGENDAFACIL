import "./vendas.css";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChartLine,
  Check,
  CirclePlay,
  Clock,
  CreditCard,
  Heart,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Moon,
  Navigation,
  Palette,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { RevealOnScroll } from "@/components/landing/reveal";
import { LandingHeader } from "@/components/landing/header";
import { Cta } from "@/components/landing/cta";
import { formatMoney } from "@/lib/format";
import { discountPercent, monthlyEquivalentCents, PLANS, TRIAL_DAYS, type Plan } from "@/lib/plans";

const TYPES = [
  ["💈", "Barbearias"],
  ["💇‍♀️", "Salões de beleza"],
  ["💅", "Manicure e pedicure"],
  ["👁️", "Sobrancelhas e cílios"],
  ["🧖‍♀️", "Estética e spa"],
  ["🩺", "Clínicas"],
];

const FEATURES = [
  { icon: CalendarDays, color: "g-brand", title: "Agenda do dia na palma da mão", text: "Próximo cliente em destaque, concluir, marcar falta e remarcar com um toque." },
  { icon: Users, color: "g-indigo", title: "Equipe com horários próprios", text: "Cada profissional com seus serviços, dias e horários de trabalho." },
  { icon: Lock, color: "g-amber", title: "Folgas e bloqueios", text: "Feriado, férias ou um compromisso: bloqueie e o horário some do link." },
  { icon: Heart, color: "g-blue", title: "Clientes organizados", text: "Histórico de visitas e quanto cada cliente já gastou, montado sozinho." },
  { icon: ChartLine, color: "g-teal", title: "Resumo do dia", text: "Quantos atendimentos, quanto vai entrar e quantas faltas — sem planilha." },
  { icon: Moon, color: "g-purple", title: "Modo claro e escuro", text: "No painel e na sua página. Escolha o que combina com você." },
];

const FAQ = [
  ["Preciso de cartão para testar?", `Não. Você usa tudo por ${TRIAL_DAYS} dias grátis e só assina se gostar. Sem cartão e sem compromisso.`],
  ["As mensagens saem de qual WhatsApp?", "Do seu próprio número. Você conecta o WhatsApp do negócio em poucos passos e o cliente responde direto para você."],
  ["Meu cliente precisa baixar algum aplicativo?", "Não. Ele abre o seu link, escolhe o horário e pronto. Funciona em qualquer celular."],
  ["Funciona para quem trabalha sozinho?", "Sim! Funciona para quem atende sozinho e para equipes, com horários próprios para cada profissional."],
  ["Posso cancelar quando quiser?", "Pode. Não tem fidelidade nem multa: é só cancelar no painel."],
];

// Anual no meio, em destaque
const PLAN_ORDER: Plan[] = [PLANS.MONTHLY, PLANS.ANNUAL, PLANS.SEMIANNUAL];

export default async function Home({ searchParams }: { searchParams: Promise<{ conta?: string }> }) {
  const deleted = (await searchParams).conta === "excluida";
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
            <em>sem esforço.</em>
          </h1>
          <p className="sub">
            O cliente agenda sozinho pelo seu link, recebe confirmação e lembrete no seu WhatsApp, e você só atende. Para barbearias,
            salões, manicures, estética e mais.
          </p>
          <div className="ctas">
            <Cta href="/cadastro">Começar meus {TRIAL_DAYS} dias grátis</Cta>
            <a className="lp-btn ghost" href="#como">
              <CirclePlay className="i" /> Ver como funciona
            </a>
          </div>
          <div className="trust">
            <span><Check className="i" /> Pronto em 5 minutos</span>
            <span><Check className="i" /> Sem fidelidade</span>
            <span><Check className="i" /> Feito para o celular</span>
          </div>

          <div className="stage" aria-hidden="true">
            <div className="phone ph-a"><div className="scr"><ClientMock /></div></div>
            <div className="phone ph-b"><div className="scr"><PanelMock /></div></div>
            <div className="lp-float f1 lp-glass">
              <span className="ic g-green"><Check className="i" /></span>
              <div>Novo agendamento<small>Lia · hoje às 14:30</small></div>
            </div>
            <div className="lp-float f2 lp-glass">
              <span className="ic g-wa"><MessageCircle className="i" /></span>
              <div>Lembrete enviado<small>pelo seu WhatsApp</small></div>
            </div>
            <div className="lp-float f3 lp-glass">
              <span className="ic g-brand"><Moon className="i" /></span>
              <div>Funciona 24 horas<small>até enquanto você dorme</small></div>
            </div>
          </div>
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
            <ul className="checks">
              <CheckItem icon={<Palette className="i" />} color="g-purple" title="Sua marca:" text="logo, capa, cores, desenhos de fundo e modo claro ou escuro." />
              <CheckItem icon={<ImageIcon className="i" />} color="g-pink" title="Fotos dos serviços" text="para o cliente ver o que está agendando." />
              <CheckItem icon={<Clock className="i" />} color="g-blue" title="Sem conflito:" text="respeita a duração de cada serviço, almoço, folgas e a agenda de cada profissional." />
              <CheckItem icon={<RefreshCw className="i" />} color="g-green" title="O cliente troca ou cancela sozinho," text="dentro das regras que você definir." />
            </ul>
          </div>
          <div className="showcase lp-glass lp-rv" aria-hidden="true">
            <div className="bgd" />
            <div className="phone" style={{ position: "relative", transform: "none", left: "auto", top: "auto" }}>
              <div className="scr"><TimeMock /></div>
            </div>
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
            <ul className="checks">
              <CheckItem icon={<Check className="i" />} color="g-wa" title="Confirmação na hora" text="com o dia, o horário, o serviço e o link para trocar ou cancelar." />
              <CheckItem icon={<Bell className="i" />} color="g-amber" title="Lembretes no momento certo:" text="na véspera ou 24h antes, e de novo perto do horário." />
              <CheckItem icon={<Pencil className="i" />} color="g-indigo" title="Mensagens do seu jeito:" text="você edita o texto, escolhe quando enviar e pode pausar quando quiser." />
            </ul>
          </div>
          <div className="showcase dark lp-rv" aria-hidden="true">
            <div className="bgd" />
            <div className="chat">
              <div className="ctop">
                <span className="av">B</span>
                <div><b>Barbearia do João</b><small>online</small></div>
              </div>
              <div className="msgs">
                <span className="dday">HOJE</span>
                <div className="msg">
                  Olá, Lia! ✅ Seu horário em <b>Barbearia do João</b> está confirmado para sexta, 27/11 às 09:30.
                  <br />✂️ Corte masculino com João
                  <br /><span style={{ color: "#027eb5" }}>horaboa.com/agendamento/…</span>
                  <span className="tm">14:02</span>
                </div>
                <div className="msg">
                  Olá, Lia! ⏰ Passando para lembrar do seu horário em <b>Barbearia do João</b> amanhã às 09:30.
                  <span className="tm">09:30</span>
                </div>
                <div className="msg me">Combinado, estarei aí! 👍<span className="tm">09:41 ✓✓</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="blk lp-center">
        <div className="lp-wrap">
          <span className="eyebrow">Tudo em um só lugar</span>
          <h2 className="lp-disp">Tudo o que seu negócio precisa</h2>
          <div className="feats" style={{ textAlign: "left" }}>
            {FEATURES.map(({ icon: Icon, color, title, text }) => (
              <div key={title} className="feat lp-glass lp-rv">
                <span className={`ic ${color}`}><Icon className="i" /></span>
                <h3 className="lp-disp">{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="blk lp-center" id="precos">
        <div className="lp-wrap">
          <span className="eyebrow">Preços</span>
          <h2 className="lp-disp">Preço simples, <em>sem surpresa</em></h2>
          <p className="lead">Todos os recursos em todos os planos. Teste {TRIAL_DAYS} dias grátis, sem cartão.</p>
          <div className="plans" style={{ textAlign: "left" }}>
            {PLAN_ORDER.map((p) => {
              const best = p.id === "ANNUAL";
              const off = discountPercent(p);
              const saved = PLANS.MONTHLY.priceCents * p.months - p.priceCents;
              return (
                <div key={p.id} className={`plan lp-rv ${best ? "best" : "lp-glass"}`}>
                  <p className="nm lp-disp">
                    {p.name}
                    {off > 0 && <span className="tag">{best ? `Melhor preço · −${off}%` : `−${off}%`}</span>}
                  </p>
                  <p className="pr">
                    <b className="lp-disp">{formatMoney(monthlyEquivalentCents(p))}</b>
                    <small>/mês</small>
                  </p>
                  <p className="bill">{p.months === 1 ? "cobrado todo mês" : `${formatMoney(p.priceCents)} a cada ${p.months} meses`}</p>
                  <ul>
                    {["Agendamentos ilimitados", "Lembretes no WhatsApp", "Profissionais ilimitados", saved > 0 ? `Economize ${formatMoney(saved)}` : "Cancele quando quiser"].map((f) => (
                      <li key={f}><Check className="i" />{f}</li>
                    ))}
                  </ul>
                  {best ? (
                    <Cta href="/cadastro">Começar grátis</Cta>
                  ) : (
                    <Link className="lp-btn ghost" href="/cadastro">Começar grátis</Link>
                  )}
                </div>
              );
            })}
          </div>
          <div className="pay">
            <span><PixIcon /> Pix com renovação automática</span>
            <span><CreditCard className="i" /> Cartão de crédito</span>
            <span><ShieldCheck className="i" /> Pagamento seguro</span>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="blk lp-center">
        <div className="lp-wrap">
          <span className="eyebrow">Dúvidas</span>
          <h2 className="lp-disp">Perguntas frequentes</h2>
          <div className="faq" style={{ textAlign: "left" }}>
            {FAQ.map(([q, a], i) => (
              <details key={q} className="lp-glass" open={i === 0}>
                <summary>
                  {q} <span className="pl"><Plus className="i" /></span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <div className="lp-wrap">
        <section className="final lp-rv">
          <h2 className="lp-disp">Pronto para encher sua agenda?</h2>
          <p>Crie sua conta em 2 minutos e comece a receber agendamentos hoje mesmo.</p>
          <Cta href="/cadastro">Testar grátis por {TRIAL_DAYS} dias</Cta>
          <div className="trust" style={{ color: "rgba(255,255,255,.65)" }}>
            <span><Check className="i" /> Sem cartão</span>
            <span><Check className="i" /> Sem fidelidade</span>
          </div>
        </section>
      </div>

      <footer>
        <div className="lp-wrap">
          <span className="logo lp-disp" style={{ fontSize: 18 }}>
            <b>Hora</b>
            <span>Boa</span>
          </span>
          <span>
            © {new Date().getFullYear()} HoraBoa · <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function CheckItem({ icon, color, title, text }: { icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <li>
      <span className={`ic ${color}`}>{icon}</span>
      <div>
        <b>{title}</b> <span>{text}</span>
      </div>
    </li>
  );
}

function PixIcon() {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 4.5 4.5L12 11 7.5 6.5zM12 13l4.5 4.5L12 22l-4.5-4.5zM2 12l4.5-4.5L11 12l-4.5 4.5zM13 12l4.5-4.5L22 12l-4.5 4.5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
    </svg>
  );
}

/* ---------- Telas de exemplo dentro dos celulares (só ilustração) ---------- */

const SERVICES = [
  { name: "Corte masculino", price: "R$ 40", bg: "linear-gradient(135deg,#3f3f46,#18181b)", mark: "✂", sel: true },
  { name: "Barba", price: "R$ 30", bg: "linear-gradient(135deg,#92400e,#451a03)", mark: "B" },
  { name: "Corte + barba", price: "R$ 60", bg: "linear-gradient(135deg,#1e3a8a,#0f172a)", mark: "C" },
  { name: "Sobrancelha", price: "R$ 15", bg: "linear-gradient(135deg,#065f46,#022c22)", mark: "S" },
];

function ClientMock() {
  return (
    <div className="cli">
      <div className="cover" />
      <div className="head">
        <div className="lg"><span>B</span></div>
        <h4>Barbearia do João</h4>
        <span className="open"><i /> Aberto agora · até 19h</span>
        <div className="pills">
          <span className="g-wa"><MessageCircle className="i" />WhatsApp</span>
          <span className="ig"><InstagramIcon />Instagram</span>
          <span className="g-blue"><Navigation className="i" />Como chegar</span>
        </div>
      </div>
      <div className="mcard">
        <div className="prog"><i className="on" /><i /><i /><i /></div>
        <h5>Escolha o serviço</h5>
        <div className="svcs">
          {SERVICES.map((s) => (
            <div key={s.name} className={`svc ${s.sel ? "sel" : ""}`}>
              <div className="im" style={{ background: s.bg }}>{s.mark}</div>
              <div className="bd"><b>{s.name}</b><small>{s.price}</small></div>
            </div>
          ))}
        </div>
      </div>
      <div className="cbar lp-glass">
        <div className="t"><b>Corte masculino</b><span>R$ 40 · 30 min</span></div>
        <span className="go g-brand">Continuar</span>
      </div>
    </div>
  );
}

function PanelMock() {
  const rows = [
    ["15:00", "Rafael", "Barba · R$ 30"],
    ["16:00", "Bruno", "Corte + barba · R$ 60"],
    ["17:00", "Diego", "Corte · R$ 40"],
  ];
  return (
    <div className="pnl">
      <p className="hi">Boa tarde, João 👋</p>
      <h6>Hoje, <em>26 de nov.</em></h6>
      <div className="pdays">
        <span className="dk">QUA<b>25</b></span>
        <span className="sel">HOJE<b>26</b></span>
        <span className="dk">SEX<b>27</b></span>
        <span className="dk">SÁB<b>28</b></span>
        <span className="dk">DOM<b>29</b></span>
      </div>
      <div className="pstats">
        <div className="dk"><i className="g-green" /><b>8</b><small>Agendados</small></div>
        <div className="dk"><i className="g-blue" /><b>R$ 420</b><small>Previsto</small></div>
        <div className="dk"><i className="g-amber" /><b>0</b><small>Faltas</small></div>
      </div>
      <div className="pnext">
        <span className="pl">● Às 14:30</span>
        <div className="r">
          <div className="av">L</div>
          <div><b>Lia Souza</b><small>Corte masculino · João</small></div>
        </div>
        <div className="acts">
          <span className="g-green">Concluir</span>
          <span className="g-wa"><MessageCircle className="i" /></span>
          <span className="g-blue"><Phone className="i" /></span>
        </div>
      </div>
      {rows.map(([tm, name, sub]) => (
        <div key={tm} className="prow">
          <div className="tm">{tm}</div>
          <div className="c dk" style={{ ["--c" as string]: "#22c55e" }}>
            <b>{name} <em>Confirmado</em></b>
            <small>{sub}</small>
          </div>
        </div>
      ))}
      <div className="ptabs"><i /><i /><span className="fab">+</span><i /><i /></div>
    </div>
  );
}

function TimeMock() {
  const slot = { border: "1px solid rgba(0,0,0,.08)", borderRadius: 8, padding: "6px 0" };
  const day = { background: "#f4f4f5", color: "#71717a" };
  return (
    <div className="cli">
      <div className="head" style={{ marginTop: 0, paddingTop: 34, textAlign: "center" }}>
        <div className="lg" style={{ margin: "0 auto", boxShadow: "0 10px 30px rgba(254,110,2,.35)" }}><span>B</span></div>
        <h4>Barbearia do João</h4>
        <span className="open"><i /> Aberto agora · até 19h</span>
      </div>
      <div className="mcard">
        <div className="prog"><i className="on" /><i className="on" /><i className="on" /><i /></div>
        <h5>Escolha o dia e o horário</h5>
        <div className="pdays" style={{ marginTop: 0 }}>
          <span style={day}>HOJE<b style={{ color: "#111" }}>26</b></span>
          <span className="sel">SEX<b>27</b></span>
          <span style={day}>SÁB<b style={{ color: "#111" }}>28</b></span>
          <span style={{ ...day, color: "#a1a1aa" }}>DOM<b style={{ color: "#a1a1aa" }}>29</b></span>
        </div>
        <div style={{ marginTop: 10, borderRadius: 14, border: "1px solid rgba(0,0,0,.07)", padding: 8 }}>
          <b style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: "#fef3c7", display: "grid", placeItems: "center" }}>☀️</span>Manhã
          </b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 7, fontSize: 10.5, fontWeight: 700, textAlign: "center" }}>
            <span style={slot}>09:00</span>
            <span className="g-brand" style={{ borderRadius: 8, padding: "6px 0" }}>09:30</span>
            <span style={slot}>10:00</span>
            <span style={slot}>11:00</span>
          </div>
        </div>
      </div>
      <div className="cbar lp-glass">
        <div className="t"><b>Sex, 27/11 · 09:30</b><span>Corte masculino · João</span></div>
        <span className="go g-brand">Continuar</span>
      </div>
    </div>
  );
}
