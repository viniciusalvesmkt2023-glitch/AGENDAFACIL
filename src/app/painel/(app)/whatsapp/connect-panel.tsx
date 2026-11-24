"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startWhatsappConnection } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Status = { status: string; qr?: string | null; error?: string };

/** Mostra o QR code e acompanha a conexão até o WhatsApp conectar. */
export function ConnectPanel({ connecting }: { connecting: boolean }) {
  const [state, action] = useActionState(startWhatsappConnection, undefined);
  const [status, setStatus] = useState<Status | null>(null);
  const router = useRouter();
  const active = connecting || state?.success === null;

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      try {
        const data: Status = await (await fetch("/api/whatsapp/status", { cache: "no-store" })).json();
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
  }, [active, router]);

  if (!active) {
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm text-zinc-600">
          Conecte o WhatsApp do seu estabelecimento para enviar confirmações e lembretes automáticos aos clientes.
          As mensagens saem do <strong>seu número</strong>, e as respostas chegam direto no seu WhatsApp.
        </p>
        <FormMessage error={state?.error} />
        <SubmitButton pendingText="Preparando...">Conectar WhatsApp</SubmitButton>
      </form>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[280px_1fr] sm:items-center">
      <div className="grid h-[280px] w-[280px] place-items-center rounded-xl border border-zinc-200 bg-white">
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
        <li>Aponte a câmera para o QR code ao lado.</li>
        <li className="list-none pt-2 text-zinc-500">O QR code se renova sozinho. Esta tela atualiza quando conectar.</li>
      </ol>
    </div>
  );
}
