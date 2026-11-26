import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { HoursForm } from "../../../horarios/hours-form";
import { weekForForm } from "../../../horarios/days";

type Props = { params: Promise<{ id: string }> };

export default async function ProfessionalHoursPage({ params }: Props) {
  const user = await requireActiveUser();
  const { id } = await params;
  const pro = await db.professional.findFirst({ where: { id, businessId: user.businessId }, include: { hours: true } });
  if (!pro) notFound();
  // Ainda sem horário próprio: começa com o horário do estabelecimento para facilitar
  const rows = pro.hours.length ? pro.hours : await db.workingHour.findMany({ where: { businessId: user.businessId } });

  return (
    <>
      <Link href="/painel/profissionais" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-navy-900">
        <ChevronLeft className="h-4 w-4" /> Profissionais
      </Link>
      <PageHeader
        title={`Horário de ${pro.name}`}
        description="Dias e horários em que este profissional atende. Folgas de um dia e férias você marca em Bloqueios."
      />
      <HoursForm days={weekForForm(rows)} professional={{ id: pro.id, name: pro.name, customHours: pro.customHours }} />
    </>
  );
}
