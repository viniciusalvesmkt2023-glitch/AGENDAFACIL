"use client";

import { useActionState, useState } from "react";
import { PlayCircle } from "lucide-react";
import { saveLesson } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { youtubeId } from "@/lib/youtube";
import { formatDuration } from "@/lib/lessons";

type Lesson = { id: string; moduleId: string; title: string; description: string | null; youtubeId: string; durationSec: number | null; published: boolean };

/** Cadastro/edição de uma aula: cola o link do YouTube e já vê a capa. */
export function LessonForm({ lesson, modules }: { lesson?: Lesson; modules: { id: string; name: string; emoji: string }[] }) {
  const [state, action] = useActionState(saveLesson, undefined);
  const [video, setVideo] = useState(lesson ? `https://youtu.be/${lesson.youtubeId}` : "");
  const [moduleId, setModuleId] = useState(lesson?.moduleId ?? modules[0]?.id ?? "new");
  const id = youtubeId(video);
  return (
    <form action={action} className="ad-ctrl-body" data-testid="lesson-form">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <div>
        <label className="ad-lbl" htmlFor="video">Link do vídeo no YouTube</label>
        <input id="video" name="video" className="ad-input" inputMode="url" placeholder="https://youtu.be/..." value={video} onChange={(e) => setVideo(e.target.value)} required />
        <p className="ad-hint" style={{ marginTop: 6 }}>Pode deixar o vídeo como “não listado” no YouTube: só quem está no painel vê.</p>
      </div>
      <div className="ad-thumb">
        {id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="Capa do vídeo" />
        ) : (
          <div className="ad-thumb-empty"><span><PlayCircle /> {video ? "Link não reconhecido" : "Cole um link para ver a capa"}</span></div>
        )}
      </div>
      <div>
        <label className="ad-lbl" htmlFor="title">Título</label>
        <input id="title" name="title" className="ad-input" defaultValue={lesson?.title} placeholder="Ex.: Como funciona a agenda" required maxLength={120} />
      </div>
      <div>
        <label className="ad-lbl" htmlFor="moduleId">Módulo</label>
        <select id="moduleId" name="moduleId" className="ad-input" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          <option value="new">+ Criar módulo novo</option>
        </select>
      </div>
      {moduleId === "new" && (
        <div className="ad-les-new">
          <div style={{ width: 76 }}>
            <label className="ad-lbl" htmlFor="moduleEmoji">Ícone</label>
            <input id="moduleEmoji" name="moduleEmoji" className="ad-input" defaultValue="🎓" maxLength={8} style={{ textAlign: "center" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ad-lbl" htmlFor="moduleName">Nome do módulo</label>
            <input id="moduleName" name="moduleName" className="ad-input" placeholder="Ex.: Primeiros passos" maxLength={40} required />
          </div>
        </div>
      )}
      <div>
        <label className="ad-lbl" htmlFor="description">Descrição curta <span style={{ fontWeight: 500, color: "var(--muted)" }}>(opcional)</span></label>
        <textarea id="description" name="description" className="ad-input" rows={2} style={{ height: 70, paddingTop: 10 }} defaultValue={lesson?.description ?? ""} maxLength={300} placeholder="Uma frase sobre o que a pessoa vai aprender" />
      </div>
      <div>
        <label className="ad-lbl" htmlFor="duration">Duração <span style={{ fontWeight: 500, color: "var(--muted)" }}>(opcional)</span></label>
        <input id="duration" name="duration" className="ad-input" defaultValue={formatDuration(lesson?.durationSec)} placeholder="5:20" style={{ maxWidth: 140 }} />
      </div>
      <label className="ad-check ad-les-pub">
        <input type="checkbox" name="published" defaultChecked={lesson ? lesson.published : true} />
        <span><b>Publicada</b> · aparece no Suporte de todos os clientes</span>
      </label>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="ad-btn ad-g-brand" pendingText="Salvando...">{lesson ? "Salvar alterações" : "Salvar aula"}</SubmitButton>
    </form>
  );
}
