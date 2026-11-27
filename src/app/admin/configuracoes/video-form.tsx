"use client";

import { useActionState, useState } from "react";
import { PlayCircle } from "lucide-react";
import { saveVideoSetting } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { youtubeId } from "@/lib/youtube";

/** Bloco "Vídeo do Ver como funciona": cola o link do YouTube e vê a miniatura antes de salvar. */
export function VideoForm({ current }: { current: string }) {
  const [state, action] = useActionState(saveVideoSetting, undefined);
  const [value, setValue] = useState(current);
  const id = youtubeId(value);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="video">Link do vídeo no YouTube</label>
        <input id="video" name="video" className="input" inputMode="url" placeholder="https://youtu.be/..." value={value} onChange={(e) => setValue(e.target.value)} required />
        <p className="mt-1 text-xs text-zinc-500">Aceita links youtu.be, youtube.com/watch?v=… e Shorts. O vídeo começa sozinho, sem som, e o visitante toca para ativar o som.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
        {id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="Miniatura do vídeo" className="aspect-video w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center text-sm text-zinc-500">
            <span className="flex items-center gap-2"><PlayCircle className="h-5 w-5" /> {value ? "Link não reconhecido" : "Cole um link para ver a miniatura"}</span>
          </div>
        )}
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full sm:w-auto" pendingText="Salvando...">Salvar vídeo</SubmitButton>
    </form>
  );
}
