"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/** Botão de calendário que abre o seletor de data nativo do celular. */
export function DatePickerButton({ date, professional }: { date: string; professional: string }) {
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
          if (e.target.value) router.push(`/painel?data=${e.target.value}${professional ? `&profissional=${professional}` : ""}`);
        }}
      />
    </label>
  );
}
