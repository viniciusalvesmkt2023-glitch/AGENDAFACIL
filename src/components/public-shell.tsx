import { brandPalette } from "@/lib/brand-colors";
import { PatternLayer } from "./patterns";

/**
 * Fundo das páginas do cliente: cor do estabelecimento, modo claro/escuro e desenho de fundo.
 * Também usado na prévia do painel.
 */
export function PublicShell({
  theme,
  color,
  pattern,
  uid,
  className = "",
  children,
}: {
  theme: string;
  color: string | null;
  pattern: string;
  uid: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative isolate bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 ${theme === "DARK" ? "theme-dark" : ""} ${className}`}
      style={brandPalette(color) as React.CSSProperties}
    >
      {pattern !== "NONE" && (
        <div className="absolute inset-0 -z-10 overflow-hidden text-brand-600 opacity-[0.08] dark:text-brand-300 dark:opacity-[0.07]">
          <PatternLayer pattern={pattern} uid={`${uid}-fundo`} />
        </div>
      )}
      {children}
    </div>
  );
}
