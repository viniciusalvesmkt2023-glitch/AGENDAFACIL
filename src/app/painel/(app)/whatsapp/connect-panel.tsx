"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, QrCode } from "lucide-react";
import { requestPairingCode, startWhatsappConnection } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";

type Status = { status: string; qr?: string | null; error?: string };
type Mode = "qr" | "code";

/**
 * Conecta o WhatsApp do estabelecimento de dois jeitos:
 * - QR code: para quem está no computador e escaneia com o celular;
 * - Código: para quem está no próprio celular do WhatsApp (não dá para escanear a própria tela).
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

  const qrActive = mode === "qr" && (connecting || state?.success === null);
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1" role="tablist">
        {(
          [
            { id: "code", label: "Código", hint: "neste celular", icon: KeyRound },
            { id: "qr", label: "QR code", hint: "pelo computador", icon: QrCode },
          ] as const
        ).map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition ${
              mode === id ? "bg-white text-navy-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>
              {label} <span className="hidden font-normal text-zinc-400 sm:inline">({hint})</span>
            </span>
          </button>
        ))}
      </div>

      {mode === "code" ? (
        pairing?.code ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-4 text-center">
              <p className="text-sm text-brand-900">Seu código de conexão</p>
              <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.2em] text-navy-900" data-testid="pairing-code">
                {pairing.code.length === 8 ? `${pairing.code.slice(0, 4)}-${pairing.code.slice(4)}` : pairing.code}
              </p>
              <div className="mt-3 flex justify-center">
                <CopyButton value={pairing.code} label="Copiar código" />
              </div>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
              <li>Abra o <strong>WhatsApp</strong> e toque em <strong>⋮</strong> (Android) ou <strong>Configurações</strong> (iPhone).</li>
              <li>Toque em <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong>.</li>
              <li>Toque em <strong>Conectar com número de telefone</strong> (embaixo da câmera).</li>
              <li>Digite o código acima. Esta tela atualiza sozinha quando conectar.</li>
            </ol>
            <form action={pairingAction}>
              <input type="hidden" name="phone" value={pairing.phone} />
              <SubmitButton className="btn-secondary btn-sm" pendingText="Gerando...">Gerar outro código</SubmitButton>
            </form>
          </div>
        ) : (
          <form action={pairingAction} className="space-y-3">
            <p className="text-sm text-zinc-600">
              Ideal quando o WhatsApp do estabelecimento está <strong>neste celular</strong>. Informe o número e digite o código
              que vamos gerar no seu WhatsApp.
            </p>
            <div>
              <label className="label" htmlFor="pairPhone">Número do WhatsApp</label>
              <input
                className="input"
                id="pairPhone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                defaultValue={pairing?.phone ?? defaultPhone}
                required
              />
            </div>
            <FormMessage error={pairing?.error} />
            <SubmitButton className="btn-primary w-full" pendingText="Gerando código...">Gerar código</SubmitButton>
          </form>
        )
      ) : qrActive ? (
        <div className="grid gap-6 sm:grid-cols-[280px_1fr] sm:items-center">
          <div className="mx-auto grid h-[280px] w-[280px] place-items-center rounded-xl border border-zinc-200 bg-white keep-white">
            {status?.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.qr} alt="QR code para conectar o WhatsApp" className="h-[260px] w-[260px]" />
            ) : (
              <p className="px-6 text-center text-sm text-zinc-500">
                {status?.status === "ERROR" ? status.error : "Gerando QR code..."}
              </p>
            )}
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            <li>Abra o <strong>WhatsApp</strong> no celular do estabelecimento.</li>
            <li>Toque em <strong>⋮ Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone).</li>
            <li>Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>.</li>
            <li>Aponte a câmera para o QR code.</li>
            <li className="list-none pt-2 text-zinc-500">O QR code se renova sozinho. Esta tela atualiza quando conectar.</li>
          </ol>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <p className="text-sm text-zinc-600">
            Conecte o WhatsApp do seu estabelecimento para enviar confirmações e lembretes automáticos aos clientes. As
            mensagens saem do <strong>seu número</strong>, e as respostas chegam direto no seu WhatsApp.
          </p>
          <FormMessage error={state?.error} />
          <SubmitButton pendingText="Preparando...">Conectar WhatsApp</SubmitButton>
        </form>
      )}
    </div>
  );
}
