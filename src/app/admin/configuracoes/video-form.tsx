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
    <form action={action} className="ad-ctrl-body">
      <div>
        <label className="ad-lbl" htmlFor="video">Link do vídeo no YouTube</label>
        <input id="video" name="video" className="ad-input" inputMode="url" placeholder="https://youtu.be/..." value={value} onChange={(e) => setValue(e.target.value)} required />
        <p className="ad-hint" style={{ marginTop: 6 }}>Aceita links youtu.be, youtube.com/watch?v=… e Shorts. O vídeo começa sozinho, sem som, e o visitante toca para ativar o som.</p>
      </div>
      <div className="ad-thumb">
        {id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="Miniatura do vídeo" />
        ) : (
          <div className="ad-thumb-empty">
            <span><PlayCircle /> {value ? "Link não reconhecido" : "Cole um link para ver a miniatura"}</span>
          </div>
        )}
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="ad-btn ad-g-brand" pendingText="Salvando...">Salvar vídeo</SubmitButton>
    </form>
  );
}
