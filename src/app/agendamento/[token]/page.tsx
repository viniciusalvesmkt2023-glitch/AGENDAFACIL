import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone } from "@/lib/time";
import { formatMoney, whatsappLink } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cancelByClient } from "./actions";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ novo?: string }> };

export const metadata = { title: "Seu agendamento" };

export default async function AppointmentPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { novo } = await searchParams;
  const a = await db.appointment.findUnique({
    where: { cancelToken: token },
    include: { business: true, service: true, professional: true, client: true },
  });
  if (!a) notFound();

  const now = nowInTimezone();
  const isPast = a.date < now.date || (a.date === now.date && a.startMinutes <= now.minutes);
  const canCancel = !isPast && (a.status === "SCHEDULED" || a.status === "CONFIRMED");
  const when = `${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}`;
  const justBooked = novo === "1" && a.status === "SCHEDULED";

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="card w-full max-w-md overflow-hidden">
        <div className={`px-6 py-8 text-center ${a.status === "CANCELED" ? "bg-zinc-100" : "bg-emerald-50"}`}>
          <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${a.status === "CANCELED" ? "bg-zinc-200" : "bg-emerald-100 text-emerald-700"}`}>
            {a.status === "CANCELED" ? "✕" : "✓"}
          </div>
          <h1 className="mt-4 text-xl font-semibold">
            {a.status === "CANCELED" ? "Agendamento cancelado" : justBooked ? "Agendamento realizado!" : "Seu agendamento"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{a.business.name}</p>
        </div>

        <dl className="space-y-3 p-6 text-sm">
          <Row label="Status"><StatusBadge status={a.status} /></Row>
          <Row label="Serviço">{a.service.name}</Row>
          <Row label="Profissional">{a.professional.name}</Row>
          <Row label="Quando"><span className="capitalize">{when}</span></Row>
          <Row label="Valor">{formatMoney(a.priceCents)}</Row>
          {a.business.address && <Row label="Endereço">{a.business.address}</Row>}
        </dl>

        <div className="space-y-3 border-t border-zinc-100 p-6">
          {justBooked && (
            <p className="text-center text-sm text-zinc-500">
              Guarde este link para consultar ou cancelar seu horário.
            </p>
          )}
          {a.business.phone && a.status !== "CANCELED" && (
            <a
              href={whatsappLink(
                a.business.phone,
                `Olá! Acabei de agendar ${a.service.name} para ${when} em nome de ${a.client.name}.`,
              )}
              target="_blank"
              className="btn-primary w-full"
            >
              Falar com o estabelecimento no WhatsApp
            </a>
          )}
          {canCancel && (
            <form action={cancelByClient}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="btn-danger w-full" pendingText="Cancelando...">Cancelar agendamento</SubmitButton>
            </form>
          )}
          <Link href={`/${a.business.slug}`} className="btn-secondary w-full">
            {a.status === "CANCELED" ? "Agendar novo horário" : "Fazer outro agendamento"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
