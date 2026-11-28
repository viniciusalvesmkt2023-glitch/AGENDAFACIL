"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { KeyRound, QrCode, RefreshCw, X } from "lucide-react";
import { requestPairingCode, startWhatsappConnection } from "./actions";
import { CopyButton } from "@/components/copy-button";

type Status = { status: string; qr?: string | null; error?: string };
type Mode = "qr" | "code";

function Go({ children, pending, wide = false }: { children: React.ReactNode; pending: string; wide?: boolean }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className="wz-b1" disabled={busy} style={wide ? { width: "100%" } : undefined}>
      {busy ? pending : children}
    </button>
  );
}

/**
 * Conecta o WhatsApp do estabelecimento de dois jeitos:
 * - Código: para quem está no próprio celular do WhatsApp (não dá para escanear a própria tela);
 * - QR code: para quem está no computador e escaneia com o celular.
 */
export function ConnectPanel({ connecting, defaultPhone = "" }: { connecting: boolean; defaultPhone?: string }) {
  const [state, action] = useActionState(startWhatsappConnection, undefined);
  const [pairing, pairingAction] = useActionState(requestPairingCode, undefined);
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const router = useRouter();

  // No celular, o padrão é o código; no computador, o QR code
  useEffect(() => {
    setMode(window.matchMedia("(pointer: coarse)").matches ? "code" : "qr");
  }, []);

  // QR code abre numa janela depois de clicar em "Conectar WhatsApp"
  const [qrOpen, setQrOpen] = useState(false);
  useEffect(() => {
    if (state?.success === null) setQrOpen(true);
  }, [state]);
  const qrActive = mode === "qr" && qrOpen;
  const closeQr = useCallback(() => setQrOpen(false), []);
  const codeActive = mode === "code" && !!pairing?.code;

  // Acompanha a conexão até o WhatsApp conectar
  useEffect(() => {
    if (!qrActive && !codeActive) return;
    let stop = false;
    const url = `/api/whatsapp/status${codeActive ? "?mode=code" : ""}`;
    const tick = async () => {
      try {
        const data: Status = await (await fetch(url, { cache: "no-store" })).json();
        if (stop) return;
        setStatus(data);
        if (data.status === "CONNECTED") {
          router.refresh();
          return;
        }
      } catch {
        // tenta de novo
      }
      if (!stop) setTimeout(tick, 4000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [qrActive, codeActive, router]);

  if (!mode) return null;

  return (
    <div>
      <p className="wz-p">
        As mensagens saem do <b>seu número</b> e as respostas chegam direto no seu WhatsApp. Escolha como conectar:
      </p>
      <div className="wz-modes" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "code"} className={`wz-opt ${mode === "code" ? "on" : ""}`} onClick={() => setMode("code")}>
          <span className="wz-oi"><KeyRound /></span>
          <span><b>Código de 8 dígitos</b><small>Quando o WhatsApp está neste celular</small></span>
        </button>
        <button type="button" role="tab" aria-selected={mode === "qr"} className={`wz-opt ${mode === "qr" ? "on" : ""}`} onClick={() => setMode("qr")}>
          <span className="wz-oi"><QrCode /></span>
          <span><b>QR code</b><small>Abriu o painel no computador: aponte a câmera do celular</small></span>
        </button>
      </div>

      {mode === "code" ? (
        pairing?.code ? (
          <>
            <div className="wz-code">
              <small>Seu código de conexão</small>
              <b data-testid="pairing-code">{pairing.code.length === 8 ? `${pairing.code.slice(0, 4)}-${pairing.code.slice(4)}` : pairing.code}</b>
              <CopyButton value={pairing.code} label="Copiar código" className="wz-b2" />
            </div>
            <ol className="wz-steps">
              <li>Abra o <b>WhatsApp</b> e toque em <b>⋮</b> (Android) ou <b>Configurações</b> (iPhone).</li>
              <li>Toque em <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</li>
              <li>Toque em <b>Conectar com número de telefone</b> (embaixo da câmera).</li>
              <li>Digite o código acima. Esta tela atualiza sozinha quando conectar.</li>
            </ol>
            <form action={pairingAction} className="wz-acts">
              <input type="hidden" name="phone" value={pairing.phone} />
              <button className="wz-b2"><RefreshCw /> Gerar outro código</button>
            </form>
          </>
        ) : (
          <form action={pairingAction}>
            <label className="wz-lbl" htmlFor="pairPhone">Número do WhatsApp do estabelecimento</label>
            <input className="wz-in" id="pairPhone" name="phone" type="tel" inputMode="tel" placeholder="(11) 99999-9999" defaultValue={pairing?.phone ?? defaultPhone} required style={{ width: "100%" }} />
            {pairing?.error && <p className="wz-msg bad">{pairing.error}</p>}
            <div className="wz-acts"><Go pending="Gerando código..." wide>Gerar código →</Go></div>
          </form>
        )
      ) : (
        <form action={action}>
          {state?.error && <p className="wz-msg bad">{state.error}</p>}
          <div className="wz-acts"><Go pending="Preparando...">{connecting ? "Mostrar QR code →" : "Conectar WhatsApp →"}</Go></div>
        </form>
      )}
      {qrActive && <QrModal qr={status?.qr ?? null} error={status?.status === "ERROR" ? status.error ?? "Erro ao gerar o QR code." : null} onClose={closeQr} />}
    </div>
  );
}

/** Janela com o QR code (computador). Fecha sozinha quando o WhatsApp conecta (a página recarrega). */
function QrModal({ qr, error, onClose }: { qr: string | null; error: string | null; onClose: () => void }) {
  const [root, setRoot] = useState<Element | null>(null);
  useEffect(() => {
    setRoot(document.querySelector(".pn") ?? document.body);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  if (!root) return null;
  return createPortal(
    <div className="wz-shade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wz-modal" role="dialog" aria-modal="true" aria-labelledby="wz-qr-title" data-testid="wa-qr-modal">
        <div className="wz-mh">
          <span className="wz-wai sm"><QrCode /></span>
          <div className="min-w-0"><h2 id="wz-qr-title">Conectar WhatsApp</h2><p>Leia o QR code com o celular do estabelecimento</p></div>
          <button type="button" className="wz-x" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        <div className="wz-mb">
          <div className="wz-qrbox keep-white">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code para conectar o WhatsApp" />
            ) : (
              <span>{error ?? "Gerando QR code..."}</span>
            )}
          </div>
          <div>
            <ol className="wz-msteps">
              <li><span>Abra o <b>WhatsApp</b> no celular do estabelecimento.</span></li>
              <li><span>Toque em <b>⋮ Mais opções</b> (Android) ou <b>Configurações</b> (iPhone).</span></li>
              <li><span>Toque em <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</span></li>
              <li><span>Aponte a câmera para o QR code ao lado.</span></li>
            </ol>
            <div className="wz-mwait"><span className="wz-mspin" />Aguardando a leitura… a janela fecha sozinha.</div>
            <p className="wz-mnote">O QR code se renova sozinho a cada poucos segundos.</p>
          </div>
        </div>
      </div>
    </div>,
    root,
  );
}
