"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type Result = { slug: string; available: boolean; message: string | null; suggestions: string[] };

/** Deixa o texto no formato de link enquanto digita (sem acento, minúsculo, hífen no lugar de espaço). */
function tidy(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-/, "")
    .slice(0, 40);
}

/** Campo do link de agendamento, com verificação de disponibilidade e sugestões. */
export function SlugField({
  defaultValue,
  name = "slug",
  id = "slug",
  suggestions = [],
}: {
  defaultValue: string;
  name?: string;
  id?: string;
  /** Opções livres para o dono só tocar (mostradas enquanto o campo está vazio) */
  suggestions?: string[];
}) {
  const [value, setValue] = useState(defaultValue);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Não verifica o link atual ao abrir a tela (ele é do próprio estabelecimento)
    if (first.current) {
      first.current = false;
      return;
    }
    const v = value.replace(/-+$/, "");
    if (!v) {
      setResult(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug?s=${encodeURIComponent(v)}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.ok) setResult(await res.json());
      } catch {
        // digitou de novo antes de responder
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  return (
    <div>
      <div className="flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 md:min-h-10">
        <span className="shrink-0 pl-3 text-sm text-zinc-500">horaboa.com/</span>
        <input
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(tidy(e.target.value))}
          className="w-full min-w-0 bg-transparent py-2 pr-2 text-base text-zinc-900 outline-none md:text-sm"
          placeholder="nome-do-seu-negocio"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <span className="shrink-0 pr-3" aria-hidden="true">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : result?.available ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : result ? (
            <X className="h-4 w-4 text-red-500" />
          ) : null}
        </span>
      </div>
      <div aria-live="polite" className="mt-1.5 text-sm">
        {!value && suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-500">Sugestões:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValue(s)}
                className="max-w-full truncate rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!loading && result?.available && <p className="font-medium text-emerald-700">Link disponível</p>}
        {!loading && result && !result.available && (
          <>
            <p className="text-red-600">{result.message}</p>
            {result.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500">Que tal:</span>
                {result.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue(s)}
                    className="max-w-full truncate rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
