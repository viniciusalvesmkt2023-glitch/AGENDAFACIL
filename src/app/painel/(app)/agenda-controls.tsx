"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/** Botão de calendário que abre o seletor de data nativo do celular. */
export function DatePickerButton({ date, professional }: { date: string; professional: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <label className="btn-icon relative cursor-pointer" aria-label="Escolher data">
      <CalendarDays className="h-5 w-5" />
      <input
        ref={ref}
        type="date"
        defaultValue={date}
        className="absolute inset-0 cursor-pointer opacity-0"
        onClick={() => ref.current?.showPicker?.()}
        onChange={(e) => {
          if (e.target.value) router.push(`/painel?data=${e.target.value}${professional ? `&profissional=${professional}` : ""}`);
        }}
      />
    </label>
  );
}
