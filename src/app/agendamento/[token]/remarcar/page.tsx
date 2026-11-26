import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone, todayInTimezone } from "@/lib/time";
import { clientCanChange } from "@/lib/policy";
import { openWeekdays } from "@/lib/schedule";
import { hasAccess } from "@/lib/subscription";
import { loadClosedDates } from "@/lib/closed-dates";
import { PublicFooter, PublicFrame } from "@/components/public/frame";
import { RescheduleForm } from "./reschedule-form";

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
  const today = todayInTimezone();
  const { closedDatesFor } = await loadClosedDates(b.id, today, b.maxAdvanceDays);

  return (
    <PublicFrame uid="remarcar" className="hb-white" look={{ theme: "LIGHT", color: b.brandColor, glow: "NONE", pattern: "NONE" }}>
      <div style={{ padding: "20px 0 0" }}>
        <Link href={`/agendamento/${token}`} className="hb-pill hb-glass" style={{ marginLeft: 14 }}>
          <ChevronLeft /> Voltar
        </Link>
        <RescheduleForm
          token={token}
          slug={b.slug}
          serviceId={a.serviceId}
          professionalId={a.professionalId}
          serviceName={a.service.name}
          professionalName={a.professional.name}
          current={`${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}`}
          today={today}
          maxAdvanceDays={b.maxAdvanceDays}
          pro={{ openWeekdays: openWeekdays(a.professional, b.workingHours), closedDates: closedDatesFor(a.professionalId) }}
        />
        <PublicFooter />
      </div>
    </PublicFrame>
  );
}
