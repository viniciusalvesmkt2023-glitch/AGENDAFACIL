import { MapPin, MessageCircle, Navigation, Star } from "lucide-react";
import { PatternLayer } from "./patterns";

export type PublicHeaderProps = {
  name: string;
  tagline?: string | null;
  description?: string | null;
  address?: string | null;
  homeService?: boolean;
  whatsappHref?: string | null;
  instagram?: string | null; // nome do perfil, sem @
  directionsHref?: string | null;
  reviewHref?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  /** Desenho de fundo, usado na capa quando não há foto */
  pattern?: string;
  uid?: string;
};

/**
 * Topo da página de agendamento (capa, logo, nome e botões de contato).
 * Sem classes "sm:"/"md:" de propósito: é usado também na prévia, dentro de um celular desenhado.
 */
export function PublicHeader(p: PublicHeaderProps) {
  const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95";
  return (
    <header className="bg-white pb-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-zinc-900 dark:shadow-none">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-navy-900 to-navy-700">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : p.pattern && p.pattern !== "NONE" ? (
          <div className="absolute inset-0 text-white opacity-[0.16]">
            <PatternLayer pattern={p.pattern} uid={`${p.uid ?? "h"}-capa`} size={64} />
          </div>
        ) : (
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-2xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-10 relative">
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.logoUrl} alt={`Logo ${p.name}`} className="h-20 w-20 rounded-2xl bg-white object-cover shadow-lg ring-4 ring-white dark:ring-zinc-900" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-600 font-display text-3xl font-extrabold text-white shadow-lg ring-4 ring-white dark:ring-zinc-900">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight text-navy-900 dark:text-white">{p.name}</h1>
        {p.tagline && <p className="mt-0.5 font-medium text-brand-700 dark:text-brand-300">{p.tagline}</p>}
        {/* Quem atende a domicílio não mostra endereço aqui: a informação aparece na confirmação do agendamento */}
        {p.address && !p.homeService && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{p.address}</span>
          </p>
        )}
        {p.description && <p className="mt-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">{p.description}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {p.whatsappHref && (
            <a href={p.whatsappHref} target="_blank" rel="noopener noreferrer" className={`${chip} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400`}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {p.instagram && (
            <a
              href={`https://instagram.com/${p.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${chip} border-transparent bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)] text-white shadow-sm`}
            >
              <InstagramLogo className="h-4 w-4" /> {p.instagram}
            </a>
          )}
          {p.directionsHref && !p.homeService && (
            <a href={p.directionsHref} target="_blank" rel="noopener noreferrer" className={`${chip} border-zinc-200 bg-white text-navy-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100`}>
              <Navigation className="h-4 w-4" /> Como chegar
            </a>
          )}
          {p.reviewHref && (
            <a href={p.reviewHref} target="_blank" rel="noopener noreferrer" className={`${chip} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300`}>
              <Star className="h-4 w-4" /> Avalie no Google
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

/** Logo do Instagram (contorno), para o botão do perfil. */
function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
