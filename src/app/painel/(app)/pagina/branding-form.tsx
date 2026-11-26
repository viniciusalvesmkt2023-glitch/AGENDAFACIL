"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, Folder, ImagePlus, Loader2, Moon, Pencil, Sun, Trash2 } from "lucide-react";
import { removeImage, saveBranding } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PublicFrame, PublicHero } from "@/components/public/frame";
import { GLOWS, glowColors } from "@/lib/glows";
import { patternsFor, PatternLayer } from "@/components/patterns";
import { businessTypeInfo } from "@/lib/business-types";
import { COLOR_PRESETS, DEFAULT_BRAND } from "@/lib/brand-colors";
import { directionsUrl, instagramHandle } from "@/lib/links";
import { resizeImage } from "@/lib/resize-image";
import { formatDuration, formatMoney } from "@/lib/format";

type Business = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  homeService: boolean;
  brandColor: string | null;
  businessType: string;
  pageTheme: string;
  bgPattern: string;
  bgGlow: string;
  tagline: string | null;
  description: string | null;
  instagram: string | null;
  mapsUrl: string | null;
  reviewUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};
type Service = { id: string; name: string; durationMinutes: number; priceCents: number; imageUrl?: string | null };

export function BrandingForm({ business: b, services }: { business: Business; services: Service[] }) {
  const [state, action] = useActionState(saveBranding, undefined);
  const [color, setColor] = useState(b.brandColor ?? DEFAULT_BRAND);
  const [tagline, setTagline] = useState(b.tagline ?? "");
  const [description, setDescription] = useState(b.description ?? "");
  const [instagram, setInstagram] = useState(b.instagram ? `@${b.instagram}` : "");
  const [mapsUrl, setMapsUrl] = useState(b.mapsUrl ?? "");
  const [reviewUrl, setReviewUrl] = useState(b.reviewUrl ?? "");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [theme, setTheme] = useState(b.pageTheme);
  const [pattern, setPattern] = useState(b.bgPattern);
  const [glow, setGlow] = useState(b.bgGlow);
  const [patternsOpen, setPatternsOpen] = useState(false);
  const patterns = patternsFor(b.businessType);
  const suggested = patterns.filter((p) => p.for.includes(b.businessType as never)).length;

  const preview = (
    <PhonePreview
      look={{ theme, color, glow, pattern, coverUrl: b.coverUrl }}
      hero={{
        name: b.name,
        tagline,
        description,
        logoUrl: b.logoUrl,
        status: { open: true, text: "até 19h" },
        whatsappHref: b.phone ? "#" : null,
        instagram: instagramHandle(instagram),
        directionsHref: !b.homeService && directionsUrl(mapsUrl, b.address) ? "#" : null,
        reviewHref: reviewUrl ? "#" : null,
      }}
      services={services}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      {/* Celular: alterna entre editar e ver a prévia */}
      <div className="sticky top-[61px] z-20 -mx-4 bg-[#f6f7fb]/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-200/70 p-1">
          {(
            [
              ["edit", "Editar", Pencil],
              ["preview", "Ver prévia", Eye],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${tab === id ? "bg-white text-navy-900 shadow-sm" : "text-zinc-500"}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-4 ${tab === "preview" ? "hidden lg:block" : ""}`}>
        <section className="card space-y-4 p-4 md:p-5">
          <h2 className="text-lg font-bold">Fotos</h2>
          <ImageField kind="logo" label="Logo" hint="Quadrada. Aparece no topo da sua página." url={b.logoUrl} />
          <ImageField kind="capa" label="Foto de capa" hint="Horizontal: a fachada, o ambiente ou um trabalho seu." url={b.coverUrl} />
        </section>

        <form action={action} className="space-y-4">
          <section className="card space-y-3 p-4 md:p-5">
            <h2 className="text-lg font-bold">Cor dos botões</h2>
            <input type="hidden" name="brandColor" value={color} />
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.name}
                  title={c.name}
                  className={`grid h-11 w-11 place-items-center rounded-full ring-offset-2 transition ${color.toUpperCase() === c.hex ? "ring-2 ring-navy-900" : ""}`}
                  style={{ background: c.hex }}
                >
                  {color.toUpperCase() === c.hex && <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={3} />}
                </button>
              ))}
              <label className="relative grid h-11 w-11 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 text-xs font-bold text-zinc-500" title="Outra cor">
                +
                <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Escolher outra cor" />
              </label>
            </div>
          </section>

          <section className="card space-y-3 p-4 md:p-5">
            <h2 className="text-lg font-bold">Aparência</h2>
            <input type="hidden" name="pageTheme" value={theme} />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["LIGHT", "Claro", Sun],
                  ["DARK", "Escuro", Moon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  aria-pressed={theme === id}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 font-semibold transition ${
                    theme === id ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "border-zinc-200 bg-white text-zinc-600"
                  }`}
                >
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>
          </section>

          <section className="card space-y-3 p-4 md:p-5">
            <div>
              <h2 className="text-lg font-bold">Luz do fundo</h2>
              <p className="text-sm text-zinc-500">Brilho suave atrás da página. &quot;Da cor&quot; usa a cor dos botões.</p>
            </div>
            <input type="hidden" name="bgGlow" value={glow} />
            <div className="grid grid-cols-4 gap-2">
              {GLOWS.map((g) => {
                const [c1, c2] = glowColors(g.id, color);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGlow(g.id)}
                    aria-pressed={glow === g.id}
                    aria-label={`Luz ${g.label}`}
                    className={`overflow-hidden rounded-xl border text-center transition ${glow === g.id ? "border-brand-500 ring-2 ring-brand-100" : "border-zinc-200"}`}
                  >
                    <span
                      className="block h-12"
                      style={{ background: g.id === "NONE" ? "#18181b" : `radial-gradient(circle at 25% 20%, ${c1}, transparent 70%), radial-gradient(circle at 85% 30%, ${c2}, #18181b 75%)` }}
                    />
                    <span className={`block truncate px-1 py-1 text-[11px] font-semibold ${glow === g.id ? "text-brand-700" : "text-zinc-600"}`}>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <input type="hidden" name="bgPattern" value={pattern} />
            {/* "Pasta": mostra só o escolhido; toque para abrir as opções */}
            <button
              type="button"
              onClick={() => setPatternsOpen((o) => !o)}
              aria-expanded={patternsOpen}
              className="flex w-full items-center gap-3 p-4 text-left md:p-5"
            >
              <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 text-brand-600">
                {pattern !== "NONE" ? (
                  <PatternLayer pattern={pattern} uid="atual" size={40} className="opacity-80" />
                ) : (
                  <Folder className="absolute inset-0 m-auto h-5 w-5 text-zinc-300" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-navy-900">Desenho de fundo</span>
                <span className="block truncate text-sm text-zinc-500">
                  {pattern === "NONE" ? "Nenhum" : patterns.find((p) => p.id === pattern)?.label}
                  {" · "}toque para {patternsOpen ? "fechar" : "escolher"}
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition ${patternsOpen ? "rotate-180" : ""}`} />
            </button>
            {patternsOpen && (
              <div className="border-t border-zinc-100 p-4 md:p-5">
                <p className="mb-3 text-sm text-zinc-500">
                  Os com ★ combinam com {businessTypeInfo(b.businessType).label.toLowerCase()}.
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {[{ id: "NONE", label: "Nenhum" }, ...patterns].map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPattern(p.id);
                        setPatternsOpen(false);
                      }}
                      aria-pressed={pattern === p.id}
                      aria-label={p.label}
                      className={`overflow-hidden rounded-xl border text-center transition ${
                        pattern === p.id ? "border-brand-500 ring-2 ring-brand-100" : "border-zinc-200"
                      }`}
                    >
                      <span className="relative block h-14 bg-zinc-50 text-brand-600">
                        {p.id !== "NONE" && <PatternLayer pattern={p.id} uid="amostra" size={40} className="opacity-80" />}
                        {i > 0 && i <= suggested && (
                          <span className="absolute right-1 top-1 rounded-full bg-brand-600 px-1.5 text-[9px] font-bold text-white">★</span>
                        )}
                      </span>
                      <span className={`block truncate px-1 py-1 text-[11px] font-semibold ${pattern === p.id ? "text-brand-700" : "text-zinc-600"}`}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-lg font-bold">Textos</h2>
            <div>
              <label className="label" htmlFor="tagline">Frase de destaque</label>
              <input className="input" id="tagline" name="tagline" maxLength={80} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex.: Estilo e precisão em cada corte" />
            </div>
            <div>
              <label className="label" htmlFor="description">Apresentação</label>
              <textarea className="input" id="description" name="description" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte um pouco sobre o seu espaço, estacionamento, formas de pagamento..." />
              <p className="mt-1 text-right text-xs text-zinc-400">{description.length}/300</p>
            </div>
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-lg font-bold">Redes e localização</h2>
            <div>
              <label className="label" htmlFor="instagram">Instagram</label>
              <input className="input" id="instagram" name="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@suabarbearia" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div>
              <label className="label" htmlFor="mapsUrl">Link do Google Maps (opcional)</label>
              <input className="input" id="mapsUrl" name="mapsUrl" inputMode="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." autoCapitalize="none" />
              <p className="mt-1 text-xs text-zinc-500">
                No Google Maps, abra o seu estabelecimento e toque em <strong>Compartilhar</strong>. Sem o link, o botão &quot;Como chegar&quot; usa o endereço das Configurações.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="reviewUrl">Link &quot;Avalie no Google&quot; (opcional)</label>
              <input className="input" id="reviewUrl" name="reviewUrl" inputMode="url" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/..." autoCapitalize="none" />
              <p className="mt-1 text-xs text-zinc-500">
                No Perfil da Empresa no Google, toque em <strong>Pedir avaliações</strong> e copie o link.
              </p>
            </div>
          </section>

          <div className="sticky bottom-24 z-10 space-y-2 md:bottom-4">
            <FormMessage error={state?.error} success={state?.success} />
            <SubmitButton className="btn-primary w-full shadow-lg md:w-auto md:px-8">Salvar página</SubmitButton>
          </div>
        </form>
      </div>

      <div className={`lg:sticky lg:top-8 ${tab === "edit" ? "hidden lg:block" : ""}`}>
        <p className="mb-2 hidden text-center text-sm font-semibold text-zinc-500 lg:block">Prévia no celular do cliente</p>
        {preview}
        <a href={`/${b.slug}`} target="_blank" className="mt-3 block text-center text-sm font-semibold text-brand-700">
          Abrir minha página de verdade
        </a>
      </div>
    </div>
  );
}

/** Celular desenhado com a página do cliente, atualizando enquanto o dono edita. */
function PhonePreview({ look, hero, services }: { look: React.ComponentProps<typeof PublicFrame>["look"]; hero: React.ComponentProps<typeof PublicHero>; services: Service[] }) {
  const list = services.length ? services.slice(0, 4) : [{ id: "x", name: "Seu serviço", durationMinutes: 30, priceCents: 4000, imageUrl: null }];
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2.2rem] border-[9px] border-navy-900 bg-navy-900 shadow-2xl">
      <div className="h-[600px] overflow-y-auto rounded-[1.6rem] no-scrollbar" data-testid="previa">
        <PublicFrame look={look} uid="previa" className="hb-preview">
          <PublicHero {...hero} />
          <section className="hb-card hb-glass">
            <div className="hb-progress"><i className="on" /><i /><i /><i /></div>
            <div className="hb-shead"><div><p className="hb-eyebrow">Etapa 1 de 4</p><p className="hb-title">Escolha o serviço</p></div></div>
            <div className="hb-stage">
              <div className="hb-grid2">
                {list.map((s, i) => (
                  <div key={s.id} className={`hb-svc ${i === 0 ? "sel" : ""}`}>
                    <span className={`hb-svc-ph ${s.imageUrl ? "has-img" : ""}`} style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined}>
                      {!s.imageUrl && s.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="hb-svc-dur">{formatDuration(s.durationMinutes)}</span>
                    <span className="hb-svc-ck">{i === 0 && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}</span>
                    <span className="hb-svc-bd">
                      <span className="hb-svc-n">{s.name}</span>
                      <span className="hb-svc-pr">{formatMoney(s.priceCents)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div style={{ height: 24 }} />
        </PublicFrame>
      </div>
    </div>
  );
}

/** Envio de logo ou capa: reduz no navegador e envia na hora. */
function ImageField({ kind, label, hint, url }: { kind: "logo" | "capa"; label: string; hint: string; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLogo = kind === "logo";

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const blob = await resizeImage(file, isLogo ? { width: 400, aspect: 1, keepTransparency: true } : { width: 1200, aspect: 12 / 5 });
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", blob, `${kind}.${blob.type.split("/")[1]}`);
      const res = await fetch("/api/imagens", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível enviar a imagem.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden border border-zinc-200 bg-zinc-50 ${isLogo ? "h-16 w-16 rounded-2xl" : "h-16 w-[154px] rounded-xl"}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-zinc-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-secondary btn-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {busy ? "Enviando..." : url ? "Trocar" : "Escolher foto"}
            </button>
            {url && !busy && (
              <form action={removeImage}>
                <input type="hidden" name="kind" value={kind} />
                <button className="btn-sm btn border border-zinc-200 bg-white text-red-600" aria-label={`Remover ${label}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid={`upload-${kind}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
    </div>
  );
}
