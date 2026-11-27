"use client";

import { startTransition, useActionState, useState } from "react";
import { saveLoyalty } from "@/app/painel/loyalty-actions";
import { LoyaltyCard } from "@/components/public/loyalty-card";
import { rewardLabel } from "@/lib/loyalty";
import { Switch } from "@/components/switch";

type Cfg = {
  enabled: boolean;
  goal: number;
  rewardType: string;
  rewardValue: number;
  rewardServiceId: string | null;
  serviceIds: string[];
  stampMonths: number | null;
  rewardDays: number | null;
  notify: boolean;
};

export function LoyaltyForm({ cfg, services, business }: { cfg: Cfg; services: { id: string; name: string; priceCents: number }[]; business: string }) {
  const [state, action, pending] = useActionState(saveLoyalty, undefined);
  const [enabled, setEnabled] = useState(cfg.enabled);
  const [goal, setGoal] = useState(cfg.goal);
  const [type, setType] = useState(cfg.rewardType);
  const [svc, setSvc] = useState(cfg.rewardServiceId ?? services[0]?.id ?? "");
  const [value, setValue] = useState(cfg.rewardType === "PERCENT" ? String(cfg.rewardValue / 100 || 20) : cfg.rewardType === "AMOUNT" ? (cfg.rewardValue / 100).toFixed(2).replace(".", ",") : "");
  const [all, setAll] = useState(cfg.serviceIds.length === 0);
  const [picked, setPicked] = useState<string[]>(cfg.serviceIds);
  const [months, setMonths] = useState(cfg.stampMonths ?? 0);
  const [demo, setDemo] = useState(Math.max(1, cfg.goal - 3));
  const num = Number(value.replace(/\./g, "").replace(",", "."));
  const label =
    type === "FREE_SERVICE"
      ? rewardLabel(type, 0, services.find((s) => s.id === svc)?.name)
      : rewardLabel(type, Math.round((Number.isFinite(num) ? num : 0) * 100));

  return (
    <form
      className="fd-grid"
      // envia sem o formulário se limpar depois (senão as escolhas voltavam ao padrão na tela)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="card space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
          <Switch name="enabled" label="Cartão fidelidade ligado" checked={enabled} onChange={setEnabled} />
          <div className="min-w-0">
            <p className="font-semibold text-navy-900">Cartão fidelidade {enabled ? "ligado" : "desligado"}</p>
            <p className="text-sm text-zinc-500">Os selos contam a partir de quando você liga pela primeira vez.</p>
          </div>
        </div>
        <div>
          <span className="label">A cada quantos atendimentos?</span>
          <input type="hidden" name="goal" value={goal} />
          <div className="flex flex-wrap gap-2">
            {[5, 6, 8, 10, 12].map((n) => (
              <button key={n} type="button" onClick={() => (setGoal(n), setDemo(Math.min(demo, n)))} className={`fd-chip ${goal === n ? "on" : ""}`} data-testid={`goal-${n}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">O cliente ganha</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["FREE_SERVICE", "🎁 Serviço grátis"],
              ["PERCENT", "% de desconto"],
              ["AMOUNT", "R$ de desconto"],
            ].map(([k, l]) => (
              <label key={k} className="fd-opt">
                <input type="radio" name="rewardType" value={k} checked={type === k} onChange={() => setType(k)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            {type === "FREE_SERVICE" ? (
              <select className="input" name="rewardServiceId" value={svc} onChange={(e) => setSvc(e.target.value)} aria-label="Serviço grátis">
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input" name="rewardValue" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "PERCENT" ? "Ex.: 20 (%)" : "Ex.: 15,00 (R$)"} aria-label="Valor do desconto" />
            )}
          </div>
        </div>
        <div>
          <span className="label">Quais serviços contam selo</span>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="allServices" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Todos os serviços
          </label>
          {!all && (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <label key={s.id} className={`fd-chip ${picked.includes(s.id) ? "on" : ""}`}>
                  <input
                    type="checkbox"
                    name="services"
                    value={s.id}
                    checked={picked.includes(s.id)}
                    onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))}
                    className="sr-only"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Selos valem por</span>
            <select className="input" name="stampMonths" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={0}>Não vencem</option>
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </label>
          <label>
            <span className="label">Prêmio vale por</span>
            <select className="input" name="rewardDays" defaultValue={cfg.rewardDays ?? 0}>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
              <option value={0}>Não vence</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm">
          <input type="checkbox" name="notify" defaultChecked={cfg.notify} className="h-4 w-4 accent-brand-600" />
          <span>
            <b className="block text-navy-900">Avisar o cliente no WhatsApp</b>
            “Você ganhou mais um selo! Faltam 3 para {label}” e quando o cartão completar.
          </span>
        </label>
        <div className="rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600">
          <b className="text-navy-900">Regras automáticas:</b>
          <br />✓ O selo entra quando o atendimento fica <b>Concluído</b> (ou pago, depois do horário).
          <br />✓ <b>Cancelado</b> (pelo cliente ou por você) e <b>falta</b> não contam — se cancelar depois, o selo sai.
          <br />✓ No máximo 1 selo por dia para o mesmo cliente.
          <br />✓ Atendimento pago com o prêmio não gera selo.
          <br />✓ Na ficha do cliente você pode dar, tirar ou zerar selos.
        </div>
        {state?.error && <p className="qb-status warn">⚠ {state.error}</p>}
        {state?.success && <p className="qb-status ok">✓ {state.success}</p>}
        <button className="btn-primary w-full md:w-auto" disabled={pending} data-testid="loyalty-save">
          Salvar cartão fidelidade
        </button>
      </div>
      <div className="fd-side">
        <LoyaltyCard business={business} goal={goal} count={Math.min(demo, goal)} next={label} rewards={demo >= goal ? [{ id: "x", label, expiresAt: null }] : []} stampMonths={months || null} />
        <p className="mt-3 text-center text-sm text-zinc-500">
          Como o cliente vê ·{" "}
          <button type="button" className="fd-chip sm" onClick={() => setDemo(Math.min(goal, demo + 1))}>
            + 1 atendimento
          </button>{" "}
          <button type="button" className="fd-chip sm" onClick={() => setDemo(0)}>
            Zerar
          </button>
        </p>
      </div>
    </form>
  );
}
