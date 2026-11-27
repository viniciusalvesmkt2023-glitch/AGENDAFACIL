"use client";

/** Botão que pergunta antes de enviar o formulário (zerar cartão, remover prêmio). */
export function ConfirmButton({ message, children, disabled, testid, danger }: { message: string; children: React.ReactNode; disabled?: boolean; testid?: string; danger?: boolean }) {
  return (
    <button
      className={`btn-secondary btn-sm ${danger ? "text-red-600" : ""}`}
      disabled={disabled}
      data-testid={testid}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
