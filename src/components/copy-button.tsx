"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

function absolute(value: string) {
  return value.startsWith("/") ? window.location.origin + value : value;
}

export function CopyButton({ value, label = "Copiar", className = "btn-secondary btn-sm" }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(absolute(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

/** Compartilha o link de agendamento (no celular abre o menu de compartilhar; no computador copia). */
export function ShareLinkButton({ value, title, className = "btn-icon", label }: { value: string; title: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label="Compartilhar meu link de agendamento"
      onClick={async () => {
        const url = absolute(value);
        if (navigator.share) {
          try {
            await navigator.share({ title, text: `Agende seu horário em ${title}:`, url });
            return;
          } catch {
            // usuário cancelou: não faz nada
            return;
          }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Share2 className="h-5 w-5" />}
      {label && <span>{copied ? "Link copiado!" : label}</span>}
    </button>
  );
}
