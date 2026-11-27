"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import "./form-modal.css";

type Ctx = { close: () => void; done: (message: string) => void };
const ModalCtx = createContext<Ctx>({ close: () => {}, done: () => {} });
/** Fecha a janela (ou fecha e mostra o aviso de salvo). */
export const useFormModal = () => useContext(ModalCtx);

/**
 * Janela de cadastro padrão do painel (profissional, serviço, bloqueio).
 * Abre pelo endereço (?novo=1 / ?editar=id) e fecha voltando para `closeHref`.
 * No celular sobe de baixo, ocupando quase a tela toda.
 */
export function FormModal({
  title,
  subtitle,
  icon,
  closeHref,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  closeHref: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [root, setRoot] = useState<Element | null>(null);
  const close = useCallback(() => router.replace(closeHref, { scroll: false }), [router, closeHref]);
  const done = useCallback(
    (message: string) => router.replace(`${closeHref}${closeHref.includes("?") ? "&" : "?"}salvo=${encodeURIComponent(message)}`, { scroll: false }),
    [router, closeHref],
  );

  useEffect(() => {
    // dentro do painel (para pegar as cores do tema claro/escuro), mas fora do conteúdo da página
    setRoot(document.querySelector(".pn") ?? document.body);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  if (!root) return null;
  return createPortal(
    <ModalCtx.Provider value={{ close, done }}>
      <div className="fm-shade" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div className={`fm-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="fm-title">
          <div className="fm-head">
            <span className="fm-ic">{icon}</span>
            <div className="fm-tt">
              <h2 id="fm-title">{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="fm-x" onClick={close} aria-label="Fechar">
              <X />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalCtx.Provider>,
    root,
  );
}

/** Rodapé fixo da janela: Cancelar + botão de salvar (o botão vem de fora). */
export function ModalFoot({ hint, children }: { hint?: string; children: React.ReactNode }) {
  const { close } = useFormModal();
  return (
    <div className="fm-foot">
      {hint && <span className="fm-hint">{hint}</span>}
      <button type="button" className="fm-cancel" onClick={close}>
        Cancelar
      </button>
      {children}
    </div>
  );
}

/** Aviso "salvo" que aparece em cima depois que a janela fecha (lê ?salvo= e limpa o endereço). */
export function SavedToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const msg = params.get("salvo");
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    setShown(msg);
    const rest = new URLSearchParams(params.toString());
    rest.delete("salvo");
    router.replace(`${pathname}${rest.size ? `?${rest}` : ""}`, { scroll: false });
    const t = setTimeout(() => setShown(null), 3200);
    return () => clearTimeout(t);
  }, [msg, params, pathname, router]);
  return (
    <div className={`fm-toast ${shown ? "on" : ""}`} role="status" aria-live="polite">
      <CheckCircle2 />
      {shown}
    </div>
  );
}
