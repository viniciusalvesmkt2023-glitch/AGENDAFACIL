"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react";
import { removeImage, saveBranding } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PublicHeader } from "@/components/public-header";
import { brandPalette, COLOR_PRESETS, DEFAULT_BRAND } from "@/lib/brand-colors";
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
  tagline: string | null;
  description: string | null;
  instagram: string | null;
  mapsUrl: string | null;
  reviewUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
};
type Service = { id: string; name: string; durationMinutes: number; priceCents: number };

export function BrandingForm({ business: b, services }: { business: Business; services: Service[] }) {
  const [state, action] = useActionState(saveBranding, undefined);
  const [color, setColor] = useState(b.brandColor ?? DEFAULT_BRAND);
  const [tagline, setTagline] = useState(b.tagline ?? "");
  const [description, setDescription] = useState(b.description ?? "");
  const [instagram, setInstagram] = useState(b.instagram ? `@${b.instagram}` : "");
  const [mapsUrl, setMapsUrl] = useState(b.mapsUrl ?? "");
  const [reviewUrl, setReviewUrl] = useState(b.reviewUrl ?? "");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const preview = (
    <PhonePreview
      color={color}
      header={{
        name: b.name,
        tagline,
        description,
        address: b.address,
        homeService: b.homeService,
        whatsappHref: b.phone ? "#" : null,
        instagram: instagramHandle(instagram),
        directionsHref: directionsUrl(mapsUrl, b.address) ? "#" : null,
        reviewHref: reviewUrl ? "#" : null,
        logoUrl: b.logoUrl,
        coverUrl: b.coverUrl,
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
function PhonePreview({ color, header, services }: { color: string; header: React.ComponentProps<typeof PublicHeader>; services: Service[] }) {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2.2rem] border-[9px] border-navy-900 bg-navy-900 shadow-2xl">
      <div className="h-[560px] overflow-y-auto rounded-[1.6rem] bg-zinc-50 no-scrollbar" style={brandPalette(color) as React.CSSProperties}>
        <PublicHeader {...header} />
        <div className="space-y-2 p-3">
          <div className="card p-3">
            <p className="font-display font-bold text-navy-900">Escolha o serviço</p>
            <div className="mt-2 space-y-2">
              {(services.length ? services.slice(0, 3) : [{ id: "x", name: "Seu serviço", durationMinutes: 30, priceCents: 4000 }]).map((s, i) => (
                <div key={s.id} className={`rounded-xl border p-2.5 text-sm ${i === 0 ? "border-brand-500 bg-brand-50" : "border-zinc-200"}`}>
                  <p className="font-semibold text-navy-900">{s.name}</p>
                  <p className="text-xs text-zinc-500">{formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5">
            {["09:00", "09:30", "10:00", "10:30"].map((t, i) => (
              <span key={t} className={`flex-1 rounded-lg border py-1.5 text-center text-xs font-semibold ${i === 1 ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 bg-white text-navy-900"}`}>
                {t}
              </span>
            ))}
          </div>
          <span className="btn-primary w-full">Confirmar agendamento</span>
        </div>
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
