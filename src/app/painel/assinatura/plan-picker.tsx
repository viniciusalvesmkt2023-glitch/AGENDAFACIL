"use client";

import { useActionState, useState } from "react";
import { startCardCheckout, startPixPayment } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type PlanView = { id: string; name: string; months: number; price: string; perMonth: string; highlight?: string };

export function PlanPicker({
  plans,
  cardEnabled,
  pixEnabled,
  defaultTaxId,
  defaultPhone,
  pixRecurring = false,
}: {
  plans: PlanView[];
  cardEnabled: boolean;
  pixEnabled: boolean;
  defaultTaxId: string;
  defaultPhone: string;
  pixRecurring?: boolean;
}) {
  const [plan, setPlan] = useState(plans[plans.length - 1].id);
  const [method, setMethod] = useState<"CARD" | "PIX">(cardEnabled || !pixEnabled ? "CARD" : "PIX");
  const [cardState, cardAction] = useActionState(startCardCheckout, undefined);
  const [pixState, pixAction] = useActionState(startPixPayment, undefined);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 pt-2 md:grid-cols-3 md:gap-4">
        {plans.map((p) => {
          const selected = p.id === plan;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`relative rounded-2xl border-2 bg-white p-4 text-left transition md:p-5 ${
                selected ? "border-brand-600 shadow-md" : "border-zinc-200 hover:border-brand-300"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-4 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                  {p.highlight}
                </span>
              )}
              <p className="font-semibold">{p.name}</p>
              <p className="mt-2 text-3xl font-bold">{p.perMonth}<span className="text-sm font-normal text-zinc-500">/mês</span></p>
              <p className="mt-1 text-sm text-zinc-500">
                {p.months === 1 ? "cobrado todo mês" : `${p.price} a cada ${p.months} meses`}
              </p>
            </button>
          );
        })}
      </div>

      <div className="card p-4 md:p-5">
        <p className="label">Forma de pagamento</p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => setMethod("CARD")} className={method === "CARD" ? "btn-primary" : "btn-secondary"}>
            Cartão de crédito
          </button>
          <button type="button" onClick={() => setMethod("PIX")} className={method === "PIX" ? "btn-primary" : "btn-secondary"}>
            Pix
          </button>
        </div>

        {method === "CARD" ? (
          <form action={cardAction} className="space-y-3">
            <input type="hidden" name="plan" value={plan} />
            <p className="text-sm text-zinc-600">
              Renovação automática no cartão. Você será direcionado ao ambiente seguro da Stripe. Cancele quando quiser.
            </p>
            <FormMessage error={cardState?.error} />
            <SubmitButton pendingText="Abrindo pagamento..." className="btn-primary w-full sm:w-auto">Assinar com cartão</SubmitButton>
            {!cardEnabled && <p className="text-xs text-amber-600">Pagamento com cartão em configuração.</p>}
          </form>
        ) : (
          <form action={pixAction} className="space-y-3">
            <input type="hidden" name="plan" value={plan} />
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="taxId">CPF ou CNPJ do pagador</label>
                <input className="input" id="taxId" name="taxId" defaultValue={defaultTaxId} required inputMode="numeric" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Telefone com DDD</label>
                <input className="input" id="phone" name="phone" defaultValue={defaultPhone} required inputMode="tel" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <p className="text-sm text-zinc-600">
              Pague com QR code ou copia e cola. A liberação é automática assim que o pagamento é confirmado.{" "}
              {pixRecurring ? (
                <>
                  A cobrança de cada período é gerada automaticamente. Ao pagar, o seu banco pode oferecer o{" "}
                  <strong>Pix Automático</strong>: autorizando, as próximas são debitadas sozinhas no vencimento.
                </>
              ) : (
                "No Pix, a renovação não é automática: avisaremos antes do vencimento."
              )}
            </p>
            <FormMessage error={pixState?.error} />
            <SubmitButton pendingText="Gerando Pix..." className="btn-primary w-full sm:w-auto">Gerar Pix</SubmitButton>
            {!pixEnabled && <p className="text-xs text-amber-600">Pagamento com Pix em configuração.</p>}
          </form>
        )}
      </div>
    </div>
  );
}
