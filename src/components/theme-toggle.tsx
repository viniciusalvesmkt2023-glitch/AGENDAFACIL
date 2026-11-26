import { Moon, Sun } from "lucide-react";
import { togglePanelTheme } from "@/app/painel/actions";

/** Botão sol/lua do painel: troca entre claro e escuro. */
export function ThemeToggle({ dark, className = "pn-ib", withLabel = false }: { dark: boolean; className?: string; withLabel?: boolean }) {
  const label = dark ? "Usar tema claro" : "Usar tema escuro";
  return (
    <form action={togglePanelTheme}>
      <button className={className} aria-label={label} title={label} data-testid="theme-toggle">
        {dark ? <Sun /> : <Moon />}
        {withLabel && <span>{dark ? "Tema claro" : "Tema escuro"}</span>}
      </button>
    </form>
  );
}
