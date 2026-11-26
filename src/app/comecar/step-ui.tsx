import Link from "next/link";
import { Check } from "lucide-react";
import { STEPS } from "./config";

/** Barra de progresso com os 5 passos. */
export function StepProgress({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5" aria-hidden="true">
        {STEPS.map((s) => (
          <span key={s.n} className={`h-1.5 flex-1 rounded-full ${s.n <= step ? "bg-brand-500" : "bg-zinc-200"}`} />
        ))}
      </div>
      <ol className="mt-3 hidden justify-between text-xs font-semibold sm:flex">
        {STEPS.map((s) => (
          <li key={s.n} className={`flex items-center gap-1 ${s.n === step ? "text-navy-900" : s.n < step ? "text-brand-700" : "text-zinc-400"}`}>
            {s.n < step ? <Check className="h-3.5 w-3.5" /> : <span>{s.n}.</span>}
            {s.title}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm font-semibold text-brand-700 sm:hidden">
        Passo {step} de {STEPS.length} · {STEPS[step - 1].title}
      </p>
    </div>
  );
}

export function StepTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
      {children && <p className="mt-1 text-zinc-600">{children}</p>}
    </div>
  );
}

/** Rodapé fixo com Voltar e Continuar (no celular fica grudado embaixo da tela). */
export function StepFooter({ back, children }: { back?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        {back && (
          <Link href={back} className="btn-secondary shrink-0">
            Voltar
          </Link>
        )}
        <div className="flex min-w-0 flex-1 justify-end">{children}</div>
      </div>
    </div>
  );
}
