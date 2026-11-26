import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone, todayInTimezone } from "@/lib/time";
import { clientCanChange } from "@/lib/policy";
import { openWeekdays } from "@/lib/schedule";
import { hasAccess } from "@/lib/subscription";
import { brandPalette } from "@/lib/brand-colors";
import { ReschedulePicker } from "@/components/reschedule-picker";
import { rescheduleByClient } from "../actions";

type Props = { params: Promise<{ token: string }> };

export const metadata = { title: "Trocar horário" };

export default async function ClientReschedulePage({ params }: Props) {
  const { token } = await params;
  const a = await db.appointment.findUnique({
    where: { cancelToken: token },
    include: { business: { include: { workingHours: true } }, service: true, professional: { include: { hours: true } } },
  });
  if (!a) notFound();
  const b = a.business;
  if (!b.clientCanReschedule || !hasAccess(b) || !clientCanChange(b, a, nowInTimezone()).allowed) redirect(`/agendamento/${token}`);

  return (
    <div className="min-h-screen px-4 py-6 sm:py-12" style={brandPalette(b.brandColor) as React.CSSProperties}>
      <div className="mx-auto w-full max-w-md">
        <Link href={`/agendamento/${token}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-500">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="card p-5">
          <h1 className="text-2xl font-extrabold">Trocar dia ou horário</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {a.service.name} com {a.professional.name}. Hoje está marcado para{" "}
            <strong className="text-navy-900">{formatDateLong(a.date)} às {minutesToTime(a.startMinutes)}</strong>.
          </p>
          <div className="mt-5">
            <ReschedulePicker
              action={rescheduleByClient}
              hidden={{ token }}
              slug={b.slug}
              serviceId={a.serviceId}
              professionalId={a.professionalId}
              today={todayInTimezone()}
              days={b.maxAdvanceDays}
              openWeekdays={openWeekdays(a.professional, b.workingHours)}
              token={token}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
