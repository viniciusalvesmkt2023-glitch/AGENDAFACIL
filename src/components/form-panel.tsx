"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/**
 * Formulário recolhível: fechado mostra só o botão "Novo ...".
 * O estado aberto/fechado é do próprio componente, para não fechar sozinho depois de salvar.
 */
export function FormPanel({ title, open: initialOpen, children }: { title: string; open: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group card overflow-hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 font-semibold text-brand-700 [&::-webkit-details-marker]:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50">
          <Plus className="h-5 w-5 transition group-open:rotate-45" />
        </span>
        {title}
      </summary>
      <div className="border-t border-zinc-100 p-4">{children}</div>
    </details>
  );
}
