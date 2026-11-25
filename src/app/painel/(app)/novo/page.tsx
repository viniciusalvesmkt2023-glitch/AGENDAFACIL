import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { isValidDate, todayInTimezone } from "@/lib/time";
import { formatDuration, formatMoney } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { ManualBookingForm } from "./manual-booking-form";

type Props = { searchParams: Promise<{ data?: string }> };

export default async function NewAppointmentPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const { data } = await searchParams;
  const [services, professionals] = await Promise.all([
    db.service.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
    db.professional.findMany({
      where: { businessId: user.businessId, active: true },
      include: { services: { select: { serviceId: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Novo agendamento"
        description="Para clientes que ligam, mandam mensagem ou chegam sem horário."
      />
      {services.length === 0 ? (
        <EmptyState title="Cadastre um serviço primeiro.">
          <Link href="/painel/servicos" className="text-brand-700 underline">Ir para Serviços</Link>
        </EmptyState>
      ) : (
        <ManualBookingForm
          slug={user.business.slug}
          canSendWhatsapp={
            user.business.whatsappStatus === "CONNECTED" &&
            user.business.whatsappRemindersEnabled &&
            user.business.confirmationEnabled
          }
          initialDate={data && isValidDate(data) ? data : todayInTimezone()}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            label: `${s.name} — ${formatDuration(s.durationMinutes)} · ${formatMoney(s.priceCents)}`,
          }))}
          professionals={professionals.map((p) => ({
            id: p.id,
            name: p.name,
            serviceIds: p.services.map((s) => s.serviceId),
          }))}
        />
      )}
    </>
  );
}
