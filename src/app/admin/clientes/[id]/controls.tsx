"use client";

import { useActionState, useState } from "react";
import { Ban, CalendarPlus, Crown } from "lucide-react";
import { cancelAccess, extendAccess, grantPlan, type ClientActionState } from "../../client-actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Tab = "extend" | "plan" | "cancel";

/** Controle da assinatura do cliente: estender acesso, ativar plano manual e cancelar (reembolso). */
export function SubscriptionControls({ id, name, plans }: { id: string; name: string; plans: { id: string; name: string; price: string }[] }) {
  const [tab, setTab] = useState<Tab>("extend");
  const [ext, extAction] = useActionState(extendAccess, undefined);
  const [grant, grantAction] = useActionState(grantPlan, undefined);
  const [cancel, cancelAction] = useActionState(cancelAccess, undefined);
  const [days, setDays] = useState(7);
  // campos controlados: o React limpa o formulário depois de cada envio, e num erro o admin perderia o que digitou
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [refund, setRefund] = useState(true);

  return (
    <div className="ad-ctrl">
      <div className="ad-ctrl-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "extend"} className={tab === "extend" ? "on" : ""} onClick={() => setTab("extend")}><CalendarPlus /> Estender acesso</button>
        <button type="button" role="tab" aria-selected={tab === "plan"} className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}><Crown /> Ativar plano</button>
        <button type="button" role="tab" aria-selected={tab === "cancel"} className={`danger ${tab === "cancel" ? "on" : ""}`} onClick={() => setTab("cancel")}><Ban /> Cancelar acesso</button>
      </div>

      {tab === "extend" && (
        <form action={extAction} className="ad-ctrl-body">
          <input type="hidden" name="id" value={id} />
          <p>Dá mais dias de uso. Se ainda está no teste grátis, aumenta o teste; se já assinou (mesmo vencido ou cancelado), aumenta o período pago e libera o acesso.</p>
          <div className="ad-days">
            {[7, 15, 30, 90].map((d) => (
              <button key={d} type="button" className={days === d ? "on" : ""} onClick={() => setDays(d)}>+{d} dias</button>
            ))}
            <label>Outro: <input type="number" min={1} max={730} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Quantidade de dias" /></label>
          </div>
          <input type="hidden" name="days" value={days} />
          <input className="ad-input" name="reason" maxLength={200} placeholder="Motivo (opcional) — ex.: cortesia, problema técnico" />
          <Msg s={ext} />
          <SubmitButton className="ad-btn ad-g-brand" pendingText="Salvando...">Dar +{days} dias</SubmitButton>
        </form>
      )}

      {tab === "plan" && (
        <form action={grantAction} className="ad-ctrl-body">
          <input type="hidden" name="id" value={id} />
          <p>Ativa um plano na mão — por exemplo, quando o cliente pagou por fora. Os meses do plano somam ao período atual.</p>
          <div className="ad-plans">
            {plans.map((p, i) => (
              <label key={p.id}><input type="radio" name="plan" value={p.id} defaultChecked={i === 0} /><span><b>{p.name}</b><small>{p.price}</small></span></label>
            ))}
          </div>
          <label className="ad-check"><input type="checkbox" name="record" defaultChecked /> Registrar como venda (entra no gráfico e no total pago)</label>
          <Msg s={grant} />
          <SubmitButton className="ad-btn ad-g-green" pendingText="Ativando...">Ativar plano</SubmitButton>
        </form>
      )}

      {tab === "cancel" && (
        <form action={cancelAction} className="ad-ctrl-body">
          <input type="hidden" name="id" value={id} />
          <p className="ad-warn">Corta o acesso de <b>{name}</b> agora: o painel e o link de agendamento ficam bloqueados e as cobranças automáticas (cartão e Pix) são encerradas.</p>
          <input className="ad-input" name="reason" maxLength={200} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo — ex.: reembolso pedido pelo cliente" />
          <label className="ad-check"><input type="checkbox" name="refund" checked={refund} onChange={(e) => setRefund(e.target.checked)} /> Marcar o último pagamento como reembolsado</label>
          <p className="ad-hint">O dinheiro em si é devolvido no painel da Stripe (cartão) ou da Asaas (Pix).</p>
          <input className="ad-input" name="confirm" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Digite CANCELAR para confirmar" autoComplete="off" />
          <Msg s={cancel} />
          <SubmitButton className="ad-btn ad-g-red" pendingText="Cancelando...">Cancelar acesso</SubmitButton>
        </form>
      )}
    </div>
  );
}

function Msg({ s }: { s: ClientActionState }) {
  return <FormMessage error={s?.error} success={s?.success} />;
}
