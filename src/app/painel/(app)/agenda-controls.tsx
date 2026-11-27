"use client";

import { openQuickBook } from "@/components/quick-book-trigger";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/** Botão de calendário que abre o seletor de data nativo do celular. */
export function DatePickerButton({ date, professional, view = "dia" }: { date: string; professional: string; view?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <label className="pn-ib relative cursor-pointer overflow-hidden" aria-label="Escolher data">
      <CalendarDays className="h-5 w-5" />
      <input
        ref={ref}
        type="date"
        defaultValue={date}
        // w-full/h-full: sem isso o campo de data do Android fica largo e passa da tela
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onClick={() => ref.current?.showPicker?.()}
        onChange={(e) => {
          if (e.target.value) router.push(`/painel?data=${e.target.value}${view !== "dia" ? `&ver=${view}` : ""}${professional ? `&profissional=${professional}` : ""}`);
        }}
      />
    </label>
  );
}

/** Botão "Novo agendamento" do topo da agenda: abre o Agendamento rápido no dia que está aberto. */
export function NewAppointmentButton({ date, className, children }: { date: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => openQuickBook({ date })} data-testid="agenda-new">
      {children}
    </button>
  );
}
