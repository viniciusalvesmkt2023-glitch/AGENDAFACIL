import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { minutesToTime, WEEKDAYS } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { HoursForm } from "./hours-form";

export default async function HoursPage() {
  const user = await requireActiveUser();
  const hours = await db.workingHour.findMany({ where: { businessId: user.businessId } });
  const byDay = new Map(hours.map((h) => [h.weekday, h]));

  // Exibe de segunda a domingo
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.map((weekday) => {
    const h = byDay.get(weekday);
    return {
      weekday,
      label: WEEKDAYS[weekday],
      isOpen: h?.isOpen ?? false,
      start: minutesToTime(h?.startMinutes ?? 540),
      end: minutesToTime(h?.endMinutes ?? 1080),
      breakStart: h?.breakStart != null ? minutesToTime(h.breakStart) : "",
      breakEnd: h?.breakEnd != null ? minutesToTime(h.breakEnd) : "",
    };
  });

  return (
    <>
      <PageHeader
        title="Horários de funcionamento"
        description="Os clientes só veem horários dentro destes períodos. Deixe o intervalo vazio se não houver pausa."
      />
      <HoursForm days={days} />
    </>
  );
}
