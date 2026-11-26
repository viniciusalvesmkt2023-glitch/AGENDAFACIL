import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDateLong, minutesToTime, todayInTimezone } from "@/lib/time";
import { openWeekdays } from "@/lib/schedule";
import { PageHeader } from "@/components/ui";
import { ReschedulePicker } from "@/components/reschedule-picker";
import { rescheduleByOwner } from "@/app/painel/actions";

type Props = { params: Promise<{ id: string }> };

export default async function OwnerReschedulePage({ params }: Props) {
  const user = await requireActiveUser();
  const { id } = await params;
  const a = await db.appointment.findFirst({
    where: { id, businessId: user.businessId, status: { in: ["SCHEDULED", "CONFIRMED"] } },
    include: { client: true, service: true, professional: { include: { hours: true } } },
  });
  if (!a) notFound();
  const businessHours = await db.workingHour.findMany({ where: { businessId: user.businessId } });

  return (
    <>
      <Link href={`/painel?data=${a.date}`} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-navy-900">
        <ChevronLeft className="h-4 w-4" /> Agenda
      </Link>
      <PageHeader
        title={`Remarcar ${a.client.name.split(" ")[0]}`}
        description={
          <>
            {a.service.name} com {a.professional.name} · hoje em{" "}
            <span className="font-semibold text-navy-900">{formatDateLong(a.date)} às {minutesToTime(a.startMinutes)}</span>
          </>
        }
      />
      <div className="card max-w-2xl p-4 md:p-5">
        <ReschedulePicker
          action={rescheduleByOwner}
          hidden={{ id: a.id }}
          slug={user.business.slug}
          serviceId={a.serviceId}
          professionalId={a.professionalId}
          today={todayInTimezone()}
          days={Math.max(60, user.business.maxAdvanceDays)}
          openWeekdays={openWeekdays(a.professional, businessHours)}
          appointmentId={a.id}
          painel
          notify
        />
      </div>
    </>
  );
}
