"use client";

import { useActionState, useState } from "react";
import { CreditCard, Lock, ShieldCheck, Zap } from "lucide-react";
import { startCardCheckout, startPixPayment } from "./actions";
import { FormMessage } from "@/components/ui";
import { useFormStatus } from "react-dom";

type PlanView = { id: string; name: string; months: number; price: string; perMonth: string; highlight?: string; savings?: string };

function GoButton({ children, pending }: { children: React.ReactNode; pending: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className="as-go" disabled={busy}>
      {busy ? pending : children}
    </button>
  );
}

/** Escolha do plano + forma de pagamento (cartão pela Stripe ou Pix). */
export function PlanPicker({
  plans,
  cardEnabled,
  pixEnabled,
  defaultTaxId,
  defaultPhone,
  pixRecurring = false,
  currentPlanId,
}: {
  plans: PlanView[];
  cardEnabled: boolean;
  pixEnabled: boolean;
  defaultTaxId: string;
  defaultPhone: string;
  pixRecurring?: boolean;
  currentPlanId?: string | null;
}) {
  const [plan, setPlan] = useState(plans[plans.length - 1].id);
  const [method, setMethod] = useState<"CARD" | "PIX">(cardEnabled || !pixEnabled ? "CARD" : "PIX");
  const [cardState, cardAction] = useActionState(startCardCheckout, undefined);
  const [pixState, pixAction] = useActionState(startPixPayment, undefined);
  const chosen = plans.find((p) => p.id === plan)!;

  return (
    <>
      <div className="as-plans" role="radiogroup" aria-label="Planos">
        {plans.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === plan} className={`as-pl ${p.id === plan ? "on" : ""}`} onClick={() => setPlan(p.id)} data-testid={`plan-${p.id}`}>
            {p.highlight && <span className="as-hl">{p.highlight}</span>}
            <div className="as-nm">
              <span>{p.name}{p.id === currentPlanId && <small>SEU PLANO</small>}</span>
              <span className="as-rd" />
            </div>
            <div className="as-pr">{p.perMonth}<small>/mês</small></div>
            <div className="as-tt">{p.months === 1 ? "Cobrado todo mês" : p.months === 12 ? `${p.price} por ano` : `${p.price} a cada ${p.months} meses`}</div>
            {p.savings && <span className="as-sv">Você economiza {p.savings}</span>}
          </button>
        ))}
      </div>

      <div className="as-pay">
        <div className="as-meth" role="radiogroup" aria-label="Forma de pagamento">
          <button type="button" role="radio" aria-checked={method === "CARD"} className={method === "CARD" ? "on" : ""} onClick={() => setMethod("CARD")}>
            <span className="as-mi"><CreditCard /></span>
            <span><b>Cartão de crédito</b><small>Renova sozinho. Cancele quando quiser.</small></span>
          </button>
          <button type="button" role="radio" aria-checked={method === "PIX"} className={method === "PIX" ? "on" : ""} onClick={() => setMethod("PIX")}>
            <span className="as-mi"><Zap /></span>
            <span><b>Pix</b><small>{pixRecurring ? "QR code na hora. Pode ativar o Pix Automático." : "QR code na hora, liberação automática."}</small></span>
          </button>
        </div>

        {method === "CARD" ? (
          <form action={cardAction} style={{ display: "grid", gap: 14 }}>
            <input type="hidden" name="plan" value={plan} />
            <FormMessage error={cardState?.error} />
            {!cardEnabled && <p className="as-note" style={{ color: "#b45309" }}>Pagamento com cartão em configuração.</p>}
            <div className="as-sum">
              <div><small>Total</small><b>{chosen.price} · plano {chosen.name}</b></div>
              <GoButton pending="Abrindo pagamento...">Assinar com cartão →</GoButton>
            </div>
            <div className="as-safe"><span><Lock /> Pagamento seguro pela Stripe</span><span><ShieldCheck /> Cancele quando quiser</span></div>
          </form>
        ) : (
          <form action={pixAction} style={{ display: "grid", gap: 14 }}>
            <input type="hidden" name="plan" value={plan} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="taxId">CPF ou CNPJ do pagador</label>
                <input className="input" id="taxId" name="taxId" defaultValue={defaultTaxId} required inputMode="numeric" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Telefone com DDD</label>
                <input className="input" id="phone" name="phone" defaultValue={defaultPhone} required inputMode="tel" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <p className="as-note">
              Pague com QR code ou copia e cola. A liberação é automática assim que o pagamento é confirmado.{" "}
              {pixRecurring
                ? "A cobrança de cada período é gerada sozinha; ao pagar, seu banco pode oferecer o Pix Automático para as próximas."
                : "No Pix, a renovação não é automática: avisamos antes do vencimento."}
            </p>
            <FormMessage error={pixState?.error} />
            {!pixEnabled && <p className="as-note" style={{ color: "#b45309" }}>Pagamento com Pix em configuração.</p>}
            <div className="as-sum">
              <div><small>Total</small><b>{chosen.price} · plano {chosen.name}</b></div>
              <GoButton pending="Gerando Pix...">Gerar Pix →</GoButton>
            </div>
            <div className="as-safe"><span><Lock /> Pagamento seguro</span><span><Zap /> Liberação na hora</span></div>
          </form>
        )}
      </div>
    </>
  );
}
