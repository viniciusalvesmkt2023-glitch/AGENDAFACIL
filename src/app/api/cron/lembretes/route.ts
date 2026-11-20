import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dueReminder } from "@/lib/reminders";
import { sendAppointmentMessage } from "@/lib/notifications";
import { hasAccess } from "@/lib/subscription";
import { addDays, localToUtc, todayInTimezone } from "@/lib/time";
import { whatsappConfigured } from "@/lib/whatsapp";

// Envia os lembretes de WhatsApp que estão no horário.
// Deve ser chamada a cada 15 minutos por um agendador (Vercel Cron ou cron-job.org),
// com o cabeçalho  Authorization: Bearer <CRON_SECRET>
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!whatsappConfigured()) return NextResponse.json({ skipped: "WhatsApp não configurado" });

  const now = new Date();
  const today = todayInTimezone();
  const candidates = await db.appointment.findMany({
    where: {
      date: { in: [today, addDays(today, 1), addDays(today, 2)] },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      reminder2hSentAt: null,
      business: { whatsappRemindersEnabled: true },
    },
    select: {
      id: true,
      date: true,
      startMinutes: true,
      createdAt: true,
      reminder24hSentAt: true,
      reminder2hSentAt: true,
      business: { select: { subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true } },
    },
    take: 2000,
  });

  const due = candidates
    .filter((a) => hasAccess(a.business, now))
    .map((a) => ({ id: a.id, type: dueReminder({ ...a, start: localToUtc(a.date, a.startMinutes) }, now) }))
    .filter((a): a is { id: string; type: "REMINDER_24H" | "REMINDER_2H" } => a.type !== null);

  const results = { SENT: 0, FAILED: 0, SKIPPED: 0 };
  // Envia em lotes de 10 para não sobrecarregar a API
  for (let i = 0; i < due.length; i += 10) {
    const batch = await Promise.all(due.slice(i, i + 10).map((a) => sendAppointmentMessage(a.id, a.type)));
    for (const r of batch) results[r]++;
  }
  return NextResponse.json({ checked: candidates.length, due: due.length, ...results });
}
