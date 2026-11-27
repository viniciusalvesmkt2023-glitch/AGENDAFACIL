"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { COMMISSION_TYPES, commissionFor, type CommissionType } from "@/lib/finance";

const HINT: Record<CommissionType, string> = {
  NONE: "Dono ou sócio",
  PERCENT: "Ex.: 40% de cada corte",
  PER_SERVICE: "Ex.: R$ 15 por corte",
  SALARY: "Ex.: R$ 2.000 por mês",
};
const pctText = (bps: number) => (bps ? String(bps / 100).replace(".", ",") : "");
const moneyText = (c: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");
const num = (v: string) => {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const money = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

/** Como o profissional ganha (para calcular a comissão em Finanças). */
export function CommissionFields({ type, rate, productBps }: { type: string; rate: number; productBps: number }) {
  const [t, setT] = useState<CommissionType>(type in COMMISSION_TYPES ? (type as CommissionType) : "NONE");
  const [value, setValue] = useState(t === "PERCENT" ? pctText(rate) : moneyText(rate));
  const [prod, setProd] = useState(pctText(productBps));
  const rateNow = t === "PERCENT" ? Math.round(num(value) * 100) : Math.round(num(value) * 100);
  const example = commissionFor({ commissionType: t, commissionRate: rateNow, productCommissionBps: Math.round(num(prod) * 100) }, { services: 100, serviceCents: 600000, productCents: 50000 }, 1);

  return (
    <section className="pr-hours" aria-label="Comissão">
      <h3>
        <Wallet /> Como esse profissional ganha
      </h3>
      <p className="pr-d">Usado para calcular a comissão em Finanças.</p>
      <div className="pr-ctypes" role="radiogroup">
        {(Object.keys(COMMISSION_TYPES) as CommissionType[]).map((k) => (
          <label key={k}>
            <input
              type="radio"
              name="commissionType"
              value={k}
              checked={t === k}
              onChange={() => {
                setT(k);
                setValue("");
              }}
              data-testid={`ct-${k}`}
            />
            <span>
              {COMMISSION_TYPES[k]}
              <small>{HINT[k]}</small>
            </span>
          </label>
        ))}
      </div>
      {t !== "NONE" && (
        <label className="pr-cfield">
          <span className="label">{t === "PERCENT" ? "Porcentagem dos serviços (%)" : t === "PER_SERVICE" ? "Valor por atendimento (R$)" : "Salário por mês (R$)"}</span>
          <input className="input" name="commissionValue" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t === "PERCENT" ? "40" : "0,00"} data-testid="ct-value" />
        </label>
      )}
      {t === "NONE" && <input type="hidden" name="commissionValue" value="" />}
      <label className="pr-cfield">
        <span className="label">% sobre os produtos que ele vender (opcional)</span>
        <input className="input" name="productCommission" inputMode="decimal" value={prod} onChange={(e) => setProd(e.target.value)} placeholder="Ex.: 10" data-testid="ct-prod" />
      </label>
      <p className="pr-ex">
        {t === "NONE" && !num(prod)
          ? "Sem comissão: o que ele faturar fica todo para o estabelecimento."
          : `Exemplo: num mês com 100 atendimentos (R$ 6.000) e R$ 500 em produtos, a comissão seria ${money(example)}.`}
      </p>
    </section>
  );
}
