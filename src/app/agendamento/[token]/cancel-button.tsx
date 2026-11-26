"use client";

import { useFormStatus } from "react-dom";

export function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="hb-ghost hb-danger"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Cancelar este agendamento?")) e.preventDefault();
      }}
    >
      {pending ? "Cancelando..." : "Cancelar agendamento"}
    </button>
  );
}
