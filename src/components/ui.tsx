import Link from "next/link";

/** Ícone da marca HoraBoa (calendário laranja e azul-marinho). */
export function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M16 0h68a16 16 0 0 1 16 16v5.4H0V16A16 16 0 0 1 16 0z" fill="#FE6E02" />
      <path d="M0 26.5h100V84a16 16 0 0 1-16 16H16A16 16 0 0 1 0 84z" fill="#15233E" />
      <g fill="#FFFFFF">
        <rect x="33.9" y="36.9" width="56.6" height="28.4" rx="3" />
        <rect x="10.6" y="59.8" width="28.8" height="28.6" rx="3" />
        <rect x="61.6" y="36.9" width="5.7" height="51.5" rx="2.85" />
      </g>
      <g fill="#FE6E02">
        <rect x="39.4" y="36.9" width="22.2" height="22.9" rx="4" />
        <rect x="67.3" y="36.9" width="23.2" height="22.9" rx="4" />
        <rect x="10.6" y="65.3" width="23.3" height="23.1" rx="4" />
      </g>
    </svg>
  );
}

/** Nome da marca: "Hora" em azul-marinho e "Boa" em laranja. */
export function Wordmark({ className = "text-xl", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className={light ? "text-white" : "text-navy-900"}>Hora</span>
      <span className="text-brand-500">Boa</span>
    </span>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="HoraBoa — início">
      <BrandIcon className={size === "lg" ? "h-10 w-10" : "h-8 w-8"} />
      <Wordmark className={size === "lg" ? "text-3xl" : "text-xl"} />
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-navy-600">{icon}</div>}
      <p className="font-display font-bold text-navy-900">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) return <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>;
  if (success)
    return (
      <p className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700" role="status">
        <span className="grid h-6 w-6 shrink-0 animate-[ui-pop_0.5s_cubic-bezier(0.2,1.4,0.4,1)_both] place-items-center rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        {success}
      </p>
    );
  return null;
}

export const STATUS_LABELS: Record<string, { label: string; className: string; dot: string }> = {
  SCHEDULED: { label: "A confirmar", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  CONFIRMED: { label: "Confirmado", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  COMPLETED: { label: "Concluído", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
  CANCELED: { label: "Cancelado", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  NO_SHOW: { label: "Faltou", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-400" };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
