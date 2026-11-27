"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Marca (ou desmarca) a aula como assistida por este usuário. */
export async function setLessonWatched(lessonId: string, watched: boolean) {
  const user = await requireUser();
  const lesson = await db.lesson.findFirst({ where: { id: lessonId, published: true }, select: { id: true } });
  if (!lesson) return;
  if (watched) {
    await db.lessonView.upsert({ where: { lessonId_userId: { lessonId, userId: user.id } }, update: {}, create: { lessonId, userId: user.id } });
  } else {
    await db.lessonView.deleteMany({ where: { lessonId, userId: user.id } });
  }
  revalidatePath("/painel/suporte");
}
