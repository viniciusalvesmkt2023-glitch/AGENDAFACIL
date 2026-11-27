import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { formatDuration, lessonThumb } from "@/lib/lessons";
import { LessonForm } from "./lesson-form";
import { deleteLesson, deleteModule, moveLesson, moveModule, saveModule, togglePublish } from "./actions";
import "./aulas.css";

type Props = { searchParams: Promise<{ editar?: string; salvo?: string }> };

const SAVED: Record<string, string> = {
  publicada: "Aula publicada. Já aparece no Suporte dos clientes.",
  rascunho: "Aula salva como rascunho (ainda não aparece para os clientes).",
  editada: "Aula atualizada.",
  excluida: "Aula excluída.",
};

/** Quadro de aulas: cadastre os vídeos do YouTube que aparecem no Suporte do painel. */
export default async function AdminLessonsPage({ searchParams }: Props) {
  const { editar, salvo } = await searchParams;
  const modules = await db.lessonModule.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { lessons: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], include: { _count: { select: { views: true } } } } },
  });
  const editing = editar ? modules.flatMap((m) => m.lessons).find((l) => l.id === editar) : undefined;
  const all = modules.flatMap((m) => m.lessons);
  const published = all.filter((l) => l.published).length;
  const views = all.reduce((n, l) => n + l._count.views, 0);
  const arrow = (action: (fd: FormData) => Promise<void>, id: string, dir: "up" | "down", disabled: boolean, label: string) => (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dir" value={dir} />
      <button className="ad-les-mv" disabled={disabled} aria-label={label} title={label}>{dir === "up" ? <ArrowUp /> : <ArrowDown />}</button>
    </form>
  );

  return (
    <section className="ad-view on">
      <div className="ad-top">
        <div>
          <h1>Aulas</h1>
          <p>Grave no YouTube (pode ser “não listado”), cole o link aqui e publique. Aparece no Suporte de todos os clientes.</p>
        </div>
        <a href="#form" className="ad-mini ad-g-brand" style={{ height: 38, color: "#fff" }}><Plus /> Nova aula</a>
      </div>
      {salvo && SAVED[salvo] && <p className="ad-les-ok" role="status">✓ {SAVED[salvo]}</p>}
      <div className="ad-les-stats">
        <span><b>{all.length}</b> aulas</span><span><b>{published}</b> publicadas</span><span><b>{modules.length}</b> módulos</span><span><b>{views}</b> vezes assistidas</span>
      </div>

      <div className="ad-les">
        <div className="ad-les-list">
          {modules.length === 0 && (
            <div className="ad-card ad-les-empty">
              <span className="ad-ic ad-g-purple"><GraduationCap /></span>
              <b>Nenhuma aula ainda</b>
              <p>Cadastre a primeira aula ao lado. Na hora de escolher o módulo, use “+ Criar módulo novo”.</p>
            </div>
          )}
          {modules.map((m, mi) => (
            <div key={m.id} className="ad-card ad-les-mod">
              <div className="ad-les-mh">
                <span className="ad-les-emoji">{m.emoji}</span>
                <details className="ad-les-rename">
                  <summary><b>{m.name}</b> <small>{m.lessons.length} aula{m.lessons.length === 1 ? "" : "s"}</small></summary>
                  <form action={saveModule} className="ad-les-rf">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="emoji" className="ad-input" defaultValue={m.emoji} maxLength={8} style={{ width: 60, textAlign: "center" }} aria-label="Ícone" />
                    <input name="name" className="ad-input" defaultValue={m.name} maxLength={40} aria-label="Nome do módulo" />
                    <button className="ad-mini ad-soft" style={{ height: 42 }}>Salvar</button>
                  </form>
                </details>
                <div className="ad-les-acts">
                  {arrow(moveModule, m.id, "up", mi === 0, "Subir módulo")}
                  {arrow(moveModule, m.id, "down", mi === modules.length - 1, "Descer módulo")}
                  {m.lessons.length === 0 && (
                    <form action={deleteModule}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="ad-les-mv danger" aria-label="Apagar módulo vazio" title="Apagar módulo vazio"><Trash2 /></button>
                    </form>
                  )}
                </div>
              </div>
              {m.lessons.map((l, li) => (
                <div key={l.id} className={`ad-les-row ${l.id === editing?.id ? "on" : ""}`}>
                  <div className="ad-les-acts col">
                    {arrow(moveLesson, l.id, "up", li === 0, "Subir aula")}
                    {arrow(moveLesson, l.id, "down", li === m.lessons.length - 1, "Descer aula")}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ad-les-th" src={lessonThumb(l.youtubeId)} alt="" loading="lazy" />
                  <div className="ad-les-t">
                    <b>{l.title}</b>
                    <small>{[formatDuration(l.durationSec), `${l._count.views} ${l._count.views === 1 ? "pessoa assistiu" : "pessoas assistiram"}`].filter(Boolean).join(" · ")}</small>
                  </div>
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className={`ad-les-st ${l.published ? "pub" : ""}`} title={l.published ? "Tirar do ar (vira rascunho)" : "Publicar"}>
                      {l.published ? <><Eye /> Publicada</> : <><EyeOff /> Rascunho</>}
                    </button>
                  </form>
                  <Link href={`/admin/aulas?editar=${l.id}#form`} className="ad-les-mv" aria-label={`Editar ${l.title}`} title="Editar"><Pencil /></Link>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="ad-card ad-set ad-les-form" id="form">
          <div className="ad-set-hd">
            <span className="ad-ic ad-g-purple"><GraduationCap /></span>
            <div className="min-w-0" style={{ flex: 1 }}>
              <h3>{editing ? "Editar aula" : "Nova aula"}</h3>
              <p>{editing ? editing.title : "Cole o link do YouTube e preencha o resto."}</p>
            </div>
            {editing && <Link href="/admin/aulas" className="ad-mini ad-soft" style={{ height: 34 }}>Cancelar</Link>}
          </div>
          <LessonForm key={editing?.id ?? "new"} lesson={editing} modules={modules.map((m) => ({ id: m.id, name: m.name, emoji: m.emoji }))} />
          {editing && (
            <form action={deleteLesson} className="ad-les-del">
              <input type="hidden" name="id" value={editing.id} />
              <button className="ad-mini" style={{ color: "#b91c1c", background: "rgba(185,28,28,.08)", height: 36 }}><Trash2 /> Excluir aula</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
