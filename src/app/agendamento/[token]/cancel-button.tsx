"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/** Cancelar com confirmação no próprio visual da página (sem a caixinha padrão do navegador). */
export function CancelButton() {
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" className="hb-btn hb-btn-red" onClick={() => setAsk(true)}>
        Cancelar agendamento
      </button>
    );
  }
  return (
    <div className="hb-confirm" role="alertdialog" aria-label="Confirmar cancelamento">
      <p>
        <b>Cancelar este agendamento?</b>
        O horário fica livre para outra pessoa marcar.
      </p>
      <div className="hb-confirm-actions">
        <button type="button" className="hb-btn hb-btn-soft" onClick={() => setAsk(false)}>
          Voltar
        </button>
        <ConfirmCancel />
      </div>
    </div>
  );
}

function ConfirmCancel() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="hb-btn hb-btn-red" disabled={pending}>
      {pending ? "Cancelando..." : "Sim, cancelar"}
    </button>
  );
}
