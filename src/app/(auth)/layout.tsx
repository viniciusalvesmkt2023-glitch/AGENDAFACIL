import Link from "next/link";
import { BrandIcon } from "@/components/ui";
import "./auth.css";

const ic = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const BENEFITS: { icon: React.ReactNode; title: string; text: string }[] = [
  { icon: ic(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>), title: "Agendamento online 24h", text: "Seu link próprio para o cliente marcar sozinho" },
  { icon: ic(<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z" />), title: "Lembretes no WhatsApp", text: "Confirma e lembra o cliente, menos faltas" },
  { icon: ic(<><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></>), title: "Agenda por profissional", text: "Dia, semana e lista em tempo real" },
  { icon: ic(<><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M7.5 8a2.5 2.5 0 1 1 4.5-1.5A2.5 2.5 0 1 1 16.5 8" /></>), title: "Cartão fidelidade", text: "Selos automáticos que trazem o cliente de volta" },
  { icon: ic(<><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>), title: "Finanças e comissões", text: "Faturamento, lucro e o que pagar à equipe" },
  { icon: ic(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></>), title: "Produtos e estoque", text: "Venda e controle de estoque no mesmo lugar" },
];

/** Entrar, cadastro e senha: lado escuro com a marca e os benefícios + o formulário. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="au">
      <span className="au-half" aria-hidden="true">
        {["o1", "o2", "o3", "s s1", "s s2", "s s3", "s s4"].map((c) => <span key={c} className={`au-orb ${c}`} />)}
      </span>
      <section className="au-brand">
        <span className="au-glow" aria-hidden="true" />
        <span className="au-ring" aria-hidden="true" />
        <Link href="/" className="au-logo" aria-label="HoraBoa — início">
          <span className="au-lic"><BrandIcon className="" /></span>
          <span className="au-wm">Hora<span>Boa</span></span>
        </Link>
        <div className="au-pitch">
          <span className="au-pill"><i />Feito para barbearias, salões e estúdios</span>
          <h2>Sua agenda cheia,<br /><em>sem esforço.</em></h2>
          <p>Tudo o que o seu negócio precisa em um só lugar, no celular ou no computador.</p>
        </div>
        <div className="au-bens">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="au-bn" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
              <span className="au-bi">{b.icon}</span>
              <div><b>{b.title}</b><small>{b.text}</small></div>
            </div>
          ))}
        </div>
        <div className="au-foot"><span><b>✓</b> 7 dias grátis</span><span><b>✓</b> Sem cartão</span><span><b>✓</b> Suporte em português</span></div>
      </section>
      <section className="au-side">
        <div className="au-card">{children}</div>
      </section>
    </div>
  );
}
