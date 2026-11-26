import "./public.css";
import { MessageCircle, Navigation, Star } from "lucide-react";
import { PatternLayer } from "../patterns";
import { glowColors } from "@/lib/glows";
import { brandPalette, DEFAULT_BRAND, isHexColor } from "@/lib/brand-colors";

export type PublicLook = { theme: string; color: string | null; glow: string; pattern: string; coverUrl?: string | null };

/**
 * Moldura das páginas do cliente: fundo claro/escuro, luzes, desenho e capa.
 * Usada no link de agendamento, na confirmação e na prévia do painel.
 */
export function PublicFrame({ look, uid, className = "", children }: { look: PublicLook; uid: string; className?: string; children: React.ReactNode }) {
  const color = isHexColor(look.color) ? look.color : DEFAULT_BRAND;
  const [g1, g2] = glowColors(look.glow, color);
  const style = { ...brandPalette(color), "--b": color, "--g1": g1, "--g2": g2 } as React.CSSProperties;
  const dark = look.theme !== "LIGHT";
  return (
    <div className={`hb ${dark ? "theme-dark" : "hb-light"} ${look.coverUrl ? "hb-has-cover" : ""} ${className}`} style={style}>
      {look.coverUrl && <div className="hb-cover" style={{ backgroundImage: `url(${look.coverUrl})` }} />}
      <div className="hb-glow hb-glow-a" />
      <div className="hb-glow hb-glow-b" />
      <div className="hb-glow hb-glow-c" />
      {look.pattern !== "NONE" && (
        <div className="hb-pattern">
          <PatternLayer pattern={look.pattern} uid={`${uid}-fundo`} size={64} />
        </div>
      )}
      <div className="hb-inner">{children}</div>
    </div>
  );
}

export type PublicHeroProps = {
  name: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  status?: { open: boolean; text: string } | null;
  whatsappHref?: string | null;
  instagram?: string | null;
  directionsHref?: string | null;
  reviewHref?: string | null;
};

/** Topo: logo com anel, nome, frase, "Aberto agora" e botões de contato. */
export function PublicHero(p: PublicHeroProps) {
  return (
    <header className="hb-hero">
      <div className="hb-ring">
        {p.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hb-logo" src={p.logoUrl} alt={`Logo ${p.name}`} />
        ) : (
          <div className="hb-logo">{p.name.charAt(0).toUpperCase()}</div>
        )}
      </div>
      <h1 className="hb-name">{p.name}</h1>
      {p.tagline && <p className="hb-tag">{p.tagline}</p>}
      {p.status && (
        <div className="hb-badges">
          <span className="hb-badge hb-glass">
            <span className={`hb-live ${p.status.open ? "" : "off"}`} />
            <b>{p.status.open ? "Aberto agora" : "Fechado agora"}</b>
            {` · ${p.status.text}`}
          </span>
        </div>
      )}
      <div className="hb-actions">
        {p.whatsappHref && (
          <a className="hb-pill hb-wa" href={p.whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle /> WhatsApp
          </a>
        )}
        {p.instagram && (
          <a className="hb-pill hb-ig" href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer">
            <InstagramLogo /> Instagram
          </a>
        )}
        {p.directionsHref && (
          <a className="hb-pill hb-map" href={p.directionsHref} target="_blank" rel="noopener noreferrer">
            <Navigation /> Como chegar
          </a>
        )}
        {p.reviewHref && (
          <a className="hb-pill hb-glass hb-review" href={p.reviewHref} target="_blank" rel="noopener noreferrer">
            <Star /> Avaliar
          </a>
        )}
      </div>
      {p.description && <p className="hb-desc">{p.description}</p>}
    </header>
  );
}

function InstagramLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PublicFooter() {
  return (
    <p className="hb-foot">
      Agendamento online por{" "}
      <a href="/">
        Hora<span>Boa</span>
      </a>
    </p>
  );
}

/**
 * Visual único das telas depois de agendar (confirmação, trocar horário, cancelado).
 * Só segue o tema claro/escuro do estabelecimento; cores, desenhos e luzes da personalização não entram.
 * Claro = branco com pontilhado; escuro = preto com pontilhado e luzes brancas.
 */
export function afterBookingFrame(pageTheme: string, color: string | null): { className: string; look: PublicLook } {
  const dark = pageTheme === "DARK";
  return {
    className: dark ? "hb-night" : "hb-white",
    look: { theme: dark ? "DARK" : "LIGHT", color, glow: "NONE", pattern: "NONE" },
  };
}
