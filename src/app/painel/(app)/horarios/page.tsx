import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { HoursForm } from "./hours-form";
import { weekForForm } from "./days";

export default async function HoursPage() {
  const user = await requireActiveUser();
  const hours = await db.workingHour.findMany({ where: { businessId: user.businessId } });
  return (
    <>
      <PageHeader
        title="Horários de funcionamento"
        description="Os clientes só veem horários dentro destes períodos. Profissionais com horário próprio seguem o deles (em Profissionais)."
      />
      <HoursForm days={weekForForm(hours)} />
    </>
  );
}
