"use client";

import { useActionState, useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import { addExpense, saveFees } from "./actions";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

const bpsText = (b: number) => String(b / 100).replace(".", ",");

export function FeesForm({ fees }: { fees: { pix: number; cash: number; debit: number; credit: number } }) {
  const [state, action, pending] = useActionState(saveFees, undefined);
  const row = (name: string, label: string, v: number) => (
    <label className="fn-fee">
      <span>{label}</span>
      <input className="am-in" name={name} inputMode="decimal" defaultValue={bpsText(v)} data-testid={`fee-${name}`} />
      <em>%</em>
    </label>
  );
  return (
    <form action={action} className="fn-fees">
      {row("cash", "💵 Dinheiro", fees.cash)}
      {row("pix", "⚡ Pix", fees.pix)}
      {row("debit", "💳 Débito", fees.debit)}
      {row("credit", "💳 Crédito", fees.credit)}
      {state?.error && <p className="qb-status warn">⚠ {state.error}</p>}
      {state?.success && <p className="qb-status ok">✓ {state.success}</p>}
      <button className="pn-btn pn-g-brand" disabled={pending} data-testid="fees-save">
        Salvar taxas
      </button>
    </form>
  );
}

export function ExpenseForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addExpense, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="fn-form">
      <label>
        <span className="am-lbl">Descrição</span>
        <input className="am-in" name="description" placeholder="Ex.: Conta de luz" required data-testid="exp-desc" />
      </label>
      <div className="fn-g2">
        <label>
          <span className="am-lbl">Valor (R$)</span>
          <input className="am-in" name="amount" inputMode="decimal" placeholder="0,00" required data-testid="exp-amount" />
        </label>
        <label>
          <span className="am-lbl">Data</span>
          <input className="am-in" type="date" name="date" defaultValue={today} required data-testid="exp-date" />
        </label>
      </div>
      <label>
        <span className="am-lbl">Categoria</span>
        <select className="am-in" name="category" defaultValue="CONTAS">
          {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="qb-tog">
        <input type="checkbox" name="recurring" data-testid="exp-rec" /> Repete todo mês (despesa fixa)
      </label>
      {state?.error && <p className="qb-status warn">⚠ {state.error}</p>}
      {state?.success && <p className="qb-status ok">✓ {state.success}</p>}
      <button className="pn-btn pn-g-brand" disabled={pending} data-testid="exp-save">
        Salvar despesa
      </button>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="pn-btn soft" onClick={() => window.print()}>
      <Printer /> <span className="am-t">Imprimir / PDF</span>
    </button>
  );
}
