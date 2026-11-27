"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { youtubeId } from "@/lib/youtube";
import { parseDuration } from "@/lib/lessons";

export type LessonState = { error?: string; success?: string } | undefined;

function refresh() {
  revalidatePath("/admin/aulas");
  revalidatePath("/painel/suporte");
}

/** Cria ou edita uma aula (e cria o módulo novo, se pedido). */
export async function saveLesson(_: LessonState, formData: FormData): Promise<LessonState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const vid = youtubeId(String(formData.get("video") ?? ""));
  if (!vid) return { error: "Cole o link do vídeo no YouTube (ex.: https://youtu.be/ABC123xyz00)." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (title.length < 3) return { error: "Dê um título para a aula." };
  const description = String(formData.get("description") ?? "").trim().slice(0, 300) || null;
  const durationRaw = String(formData.get("duration") ?? "").trim();
  const durationSec = parseDuration(durationRaw);
  if (durationRaw && !durationSec) return { error: "Duração no formato 5:20 (minutos:segundos)." };
  const published = formData.get("published") === "on";

  let moduleId = String(formData.get("moduleId") ?? "");
  if (moduleId === "new") {
    const name = String(formData.get("moduleName") ?? "").trim().slice(0, 40);
    if (name.length < 2) return { error: "Dê um nome para o módulo novo." };
    const emoji = String(formData.get("moduleEmoji") ?? "").trim().slice(0, 8) || "🎓";
    const last = await db.lessonModule.aggregate({ _max: { position: true } });
    moduleId = (await db.lessonModule.create({ data: { name, emoji, position: (last._max.position ?? -1) + 1 } })).id;
  } else if (!(await db.lessonModule.findUnique({ where: { id: moduleId } }))) {
    return { error: "Escolha o módulo." };
  }

  const current = id ? await db.lesson.findUnique({ where: { id } }) : null;
  if (id && !current) return { error: "Aula não encontrada." };
  // aula nova (ou que mudou de módulo) vai para o fim do módulo
  const needsPosition = !current || current.moduleId !== moduleId;
  const position = needsPosition
    ? ((await db.lesson.aggregate({ where: { moduleId }, _max: { position: true } }))._max.position ?? -1) + 1
    : current.position;
  const data = {
    moduleId,
    title,
    description,
    youtubeId: vid,
    durationSec,
    position,
    published,
    // "Nova" conta a partir da primeira vez que foi publicada
    publishedAt: published ? (current?.publishedAt ?? new Date()) : (current?.publishedAt ?? null),
  };
  if (current) await db.lesson.update({ where: { id: current.id }, data });
  else await db.lesson.create({ data });
  refresh();
  redirect(`/admin/aulas?salvo=${current ? "editada" : published ? "publicada" : "rascunho"}`);
}

/** Sobe ou desce a aula dentro do módulo. */
export async function moveLesson(formData: FormData) {
  await requireAdmin();
  const l = await db.lesson.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!l) return;
  const up = formData.get("dir") === "up";
  const list = await db.lesson.findMany({ where: { moduleId: l.moduleId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((x) => x.id === l.id);
  const j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.lesson.update({ where: { id: x.id }, data: { position: k } })));
  refresh();
}

/** Sobe ou desce o módulo inteiro. */
export async function moveModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const up = formData.get("dir") === "up";
  const list = await db.lessonModule.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((x) => x.id === id);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((x, k) => db.lessonModule.update({ where: { id: x.id }, data: { position: k } })));
  refresh();
}

export async function togglePublish(formData: FormData) {
  await requireAdmin();
  const l = await db.lesson.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!l) return;
  await db.lesson.update({ where: { id: l.id }, data: { published: !l.published, publishedAt: l.publishedAt ?? (!l.published ? new Date() : null) } });
  refresh();
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  await db.lesson.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  refresh();
  redirect("/admin/aulas?salvo=excluida");
}

/** Renomeia o módulo (nome e emoji). */
export async function saveModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const emoji = String(formData.get("emoji") ?? "").trim().slice(0, 8) || "🎓";
  if (name.length >= 2) await db.lessonModule.updateMany({ where: { id }, data: { name, emoji } });
  refresh();
}

/** Só apaga módulo vazio (para não perder aulas sem querer). */
export async function deleteModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if ((await db.lesson.count({ where: { moduleId: id } })) === 0) await db.lessonModule.deleteMany({ where: { id } });
  refresh();
}
