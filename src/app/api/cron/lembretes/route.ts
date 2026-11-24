import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dueReminder, reminderSchedule, type ReminderType } from "@/lib/reminders";
import { sendAppointmentMessage } from "@/lib/notifications";
import { hasAccess } from "@/lib/subscription";
import { addDays, todayInTimezone } from "@/lib/time";
import { evolutionConfigured } from "@/lib/evolution";

// Envia os lembretes de WhatsApp que estão no horário, conforme a configuração de cada estabelecimento.
// Deve ser chamada a cada 15 minutos por um agendador (Vercel Cron ou cron-job.org),
// com o cabeçalho  Authorization: Bearer <CRON_SECRET>  ou com  ?key=<CRON_SECRET>  no endereço
export const maxDuration = 60;

/** Confere a chave ignorando espaços sobrando e maiúsculas/minúsculas em "Bearer". */
function isAuthorized(header: string | null): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  const received = header?.trim().replace(/^bearer\s+/i, "").trim();
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  // Chave no cabeçalho "Authorization: Bearer ..." (Vercel Cron) ou no endereço "?key=..." (cron-job.org)
  if (!isAuthorized(req.headers.get("authorization")) && !isAuthorized(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!evolutionConfigured()) return NextResponse.json({ skipped: "WhatsApp não configurado" });

  const now = new Date();
  const today = todayInTimezone();
  const candidates = await db.appointment.findMany({
    where: {
      // lembretes saem no máximo ~2 dias antes (véspera em horário fixo)
      date: { in: [today, addDays(today, 1), addDays(today, 2)] },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      reminderShortSentAt: null,
      business: { whatsappRemindersEnabled: true, whatsappStatus: "CONNECTED" },
    },
    select: {
      id: true,
      date: true,
      startMinutes: true,
      createdAt: true,
      reminderDaySentAt: true,
      reminderShortSentAt: true,
      business: {
        select: {
          subscriptionStatus: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          reminderDayMode: true,
          reminderDayTime: true,
          reminderShortMinutes: true,
        },
      },
    },
    take: 5000,
  });

  const due = candidates
    .filter((a) => hasAccess(a.business, now))
    .map((a) => {
      const sched = reminderSchedule(a, {
        dayMode: a.business.reminderDayMode,
        dayTime: a.business.reminderDayTime,
        shortMinutes: a.business.reminderShortMinutes,
      });
      return { id: a.id, type: dueReminder(a, sched, now) };
    })
    .filter((a): a is { id: string; type: ReminderType } => a.type !== null);

  const results = { SENT: 0, FAILED: 0, SKIPPED: 0 };
  // Lotes de 10 em paralelo, com uma pequena pausa entre lotes para não parecer disparo em massa
  for (let i = 0; i < due.length; i += 10) {
    const batch = await Promise.all(due.slice(i, i + 10).map((a) => sendAppointmentMessage(a.id, a.type)));
    for (const r of batch) results[r]++;
    if (i + 10 < due.length) await new Promise((r) => setTimeout(r, 1500));
  }
  return NextResponse.json({ checked: candidates.length, due: due.length, ...results });
}
