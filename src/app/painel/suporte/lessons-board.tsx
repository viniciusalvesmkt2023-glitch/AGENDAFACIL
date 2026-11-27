"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, GraduationCap, Play, X } from "lucide-react";
import { setLessonWatched } from "./actions";
import { formatDuration, lessonThumb, nextLesson } from "@/lib/lessons";

export type BoardLesson = { id: string; moduleId: string; title: string; description: string | null; youtubeId: string; durationSec: number | null; isNew: boolean };
export type BoardModule = { id: string; name: string; emoji: string; lessons: BoardLesson[] };

/** Quadro de aulas do Suporte: continue de onde parou, módulos, cartões e o player. */
export function LessonsBoard({ modules, watched: initialWatched }: { modules: BoardModule[]; watched: string[] }) {
  const [watched, setWatched] = useState(() => new Set(initialWatched));
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<BoardLesson | null>(null);
  const [, start] = useTransition();
  const all = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const next = nextLesson(all, watched);
  const done = all.filter((l) => watched.has(l.id)).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const hero = next ?? all[0];

  function mark(l: BoardLesson, value: boolean) {
    setWatched((s) => {
      const n = new Set(s);
      if (value) n.add(l.id);
      else n.delete(l.id);
      return n;
    });
    start(() => setLessonWatched(l.id, value));
  }

  const shown = filter === "all" ? modules : modules.filter((m) => m.id === filter);
  if (!all.length) return null;

  return (
    <section className="ls" aria-label="Aulas do HoraBoa" data-testid="lessons">
      <div className="ls-hero">
        <div className="ls-hero-t">
          <span className="ls-pill"><GraduationCap /> Aulas do HoraBoa</span>
          <h2>{next ? (done ? "Continue de onde parou" : "Aprenda a usar o painel") : "Você assistiu todas as aulas 🎉"}</h2>
          <p>
            {next ? <>Próxima aula: <b>{next.title}</b>. </> : "Pode rever qualquer uma quando quiser. "}
            Aulas curtas para você dominar o HoraBoa.
          </p>
          <div className="ls-prog">
            <div className="ls-bar"><i style={{ width: `${pct}%` }} /></div>
            <small><span><b>{done} de {all.length}</b> aulas assistidas</span><span>{pct}%</span></small>
          </div>
          <button type="button" className="ls-go" onClick={() => setOpen(hero)}>
            <span><Play /></span>{next ? (done ? "Assistir próxima aula" : "Começar pela primeira aula") : "Rever a primeira aula"}
          </button>
        </div>
        <button type="button" className="ls-thumb big" onClick={() => setOpen(hero)} aria-label={`Assistir: ${hero.title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lessonThumb(hero.youtubeId)} alt="" />
          <span className="ls-play"><Play /></span>
          {hero.durationSec ? <span className="ls-dur">{formatDuration(hero.durationSec)}</span> : null}
        </button>
      </div>

      {modules.length > 1 && (
        <div className="ls-mods" role="tablist" aria-label="Módulos">
          <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            Todas <small>{all.length}</small>
          </button>
          {modules.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={filter === m.id} className={filter === m.id ? "on" : ""} onClick={() => setFilter(m.id)}>
              {m.emoji} {m.name} <small>{m.lessons.length}</small>
            </button>
          ))}
        </div>
      )}

      {shown.map((m) => (
        <div key={m.id} className="ls-sec">
          <div className="ls-sh">
            <h3>{m.emoji} {m.name}</h3>
            <span>{m.lessons.filter((l) => watched.has(l.id)).length} de {m.lessons.length} assistidas</span>
          </div>
          <div className="ls-grid">
            {m.lessons.map((l) => {
              const seen = watched.has(l.id);
              return (
                <button key={l.id} type="button" className={`ls-card ${seen ? "seen" : ""}`} onClick={() => setOpen(l)}>
                  <span className="ls-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lessonThumb(l.youtubeId)} alt="" loading="lazy" />
                    {seen ? <span className="ls-tag ok"><Check /> Assistida</span> : l.isNew ? <span className="ls-tag new">Nova</span> : null}
                    <span className="ls-play"><Play /></span>
                    {l.durationSec ? <span className="ls-dur">{formatDuration(l.durationSec)}</span> : null}
                  </span>
                  <b>{l.title}</b>
                  {l.description && <small>{l.description}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {open && (
        <Player
          lesson={open}
          modules={modules}
          all={all}
          watched={watched}
          onMark={mark}
          onOpen={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function Player({
  lesson,
  modules,
  all,
  watched,
  onMark,
  onOpen,
  onClose,
}: {
  lesson: BoardLesson;
  modules: BoardModule[];
  all: BoardLesson[];
  watched: Set<string>;
  onMark: (l: BoardLesson, v: boolean) => void;
  onOpen: (l: BoardLesson) => void;
  onClose: () => void;
}) {
  const [root, setRoot] = useState<Element | null>(null);
  const mod = modules.find((m) => m.id === lesson.moduleId)!;
  const idx = mod.lessons.findIndex((l) => l.id === lesson.id);
  const after = all[all.findIndex((l) => l.id === lesson.id) + 1];
  const seen = watched.has(lesson.id);

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
    <div className="ls-shade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ls-player" role="dialog" aria-modal="true" aria-label={lesson.title} data-testid="lesson-player">
        <button type="button" className="ls-x" onClick={onClose} aria-label="Fechar"><X /></button>
        <div className="ls-main">
          <div className="ls-video">
            <iframe
              key={lesson.id}
              src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={lesson.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="ls-info">
            <span className="ls-pill soft">{mod.emoji} {mod.name} · Aula {idx + 1} de {mod.lessons.length}</span>
            <h2>{lesson.title}</h2>
            {lesson.description && <p>{lesson.description}</p>}
            <div className="ls-acts">
              <button type="button" className={`ls-btn ${seen ? "ok" : ""}`} onClick={() => onMark(lesson, !seen)} data-testid="lesson-watched">
                {seen ? <><Check /> Assistida</> : "Marcar como assistida"}
              </button>
              {after && (
                <button
                  type="button"
                  className="ls-btn pri"
                  onClick={() => {
                    if (!seen) onMark(lesson, true);
                    onOpen(after);
                  }}
                >
                  Próxima aula <ChevronRight />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="ls-side">
          <h4>Neste módulo</h4>
          {mod.lessons.map((l, i) => (
            <button key={l.id} type="button" className={`ls-it ${l.id === lesson.id ? "cur" : ""} ${watched.has(l.id) ? "done" : ""}`} onClick={() => onOpen(l)}>
              <span className="n">{watched.has(l.id) && l.id !== lesson.id ? <Check /> : i + 1}</span>
              <span className="t">{l.title}{l.durationSec ? <small>{formatDuration(l.durationSec)}</small> : null}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    root,
  );
}
