"use client";

import { useActionState, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { saveServicesStep } from "../actions";
import { DURATION_OPTIONS } from "../config";
import { StepFooter } from "../step-ui";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { formatDuration, formatMoney } from "@/lib/format";

type Item = { key: number; name: string; durationMinutes: number; price: string; checked: boolean; custom?: boolean };
type Suggestion = { name: string; durationMinutes: number; priceCents: number; selected: boolean };
type Existing = { id: string; name: string; durationMinutes: number; priceCents: number };

const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function ServicesStep({ suggestions, existing }: { suggestions: Suggestion[]; existing: Existing[] }) {
  const [state, action] = useActionState(saveServicesStep, undefined);
  const [items, setItems] = useState<Item[]>(() =>
    suggestions.map((s, i) => ({
      key: i,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: money(s.priceCents),
      // Se já tem serviços cadastrados, nada vem marcado
      checked: existing.length === 0 && s.selected,
    })),
  );
  const update = (key: number, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const chosen = items.filter((i) => i.checked);
  const payload = JSON.stringify(chosen.map(({ name, durationMinutes, price }) => ({ name, durationMinutes, price })));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="services" value={payload} />

      {existing.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-navy-900">Já cadastrados</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600">
            {existing.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="shrink-0 text-zinc-500">{formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.key}
            className={`card p-3 transition ${it.checked ? "border-brand-300 ring-2 ring-brand-100" : "opacity-80"}`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update(it.key, { checked: !it.checked })}
                aria-pressed={it.checked}
                aria-label={`${it.checked ? "Desmarcar" : "Marcar"} ${it.name || "serviço"}`}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition ${
                  it.checked ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-300 bg-white"
                }`}
              >
                {it.checked && <Check className="h-4 w-4" strokeWidth={3} />}
              </button>
              <input
                value={it.name}
                onChange={(e) => update(it.key, { name: e.target.value, checked: true })}
                placeholder="Nome do serviço"
                aria-label="Nome do serviço"
                className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-semibold text-navy-900 outline-none focus:bg-zinc-50"
              />
              {it.custom && (
                <button
                  type="button"
                  onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {it.checked && (
              <div className="mt-3 grid grid-cols-2 gap-2 pl-10">
                <label className="min-w-0">
                  <span className="mb-1 block text-xs font-medium text-zinc-500">Duração</span>
                  <select
                    className="input"
                    value={it.durationMinutes}
                    onChange={(e) => update(it.key, { durationMinutes: Number(e.target.value) })}
                  >
                    {[...new Set([...DURATION_OPTIONS, it.durationMinutes])].sort((a, b) => a - b).map((d) => (
                      <option key={d} value={d}>{formatDuration(d)}</option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-xs font-medium text-zinc-500">Preço</span>
                  <span className="flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 md:min-h-10">
                    <span className="pl-3 text-sm text-zinc-500">R$</span>
                    <input
                      value={it.price}
                      onChange={(e) => update(it.key, { price: e.target.value })}
                      inputMode="decimal"
                      className="w-full min-w-0 bg-transparent px-2 py-2 text-base outline-none md:text-sm"
                    />
                  </span>
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setItems((l) => [...l, { key: Date.now(), name: "", durationMinutes: 30, price: "", checked: true, custom: true }])
        }
        className="btn-secondary w-full border-dashed"
      >
        <Plus className="h-4 w-4" /> Adicionar outro serviço
      </button>

      <FormMessage error={state?.error} />
      <StepFooter back="/comecar?passo=1">
        <SubmitButton className="btn-primary w-full md:w-auto md:px-8">
          {chosen.length ? `Salvar ${chosen.length} e continuar` : "Continuar"}
        </SubmitButton>
      </StepFooter>
    </form>
  );
}
