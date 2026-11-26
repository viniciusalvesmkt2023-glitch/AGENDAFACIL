import Link from "next/link";
import { CalendarClock, CalendarDays, Check, Clock, MapPin, MessageCircle, Scissors, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone } from "@/lib/time";
import { formatMoney, whatsappLink } from "@/lib/format";
import { clientCanChange, deadlineLabel } from "@/lib/policy";
import { hasAccess } from "@/lib/subscription";
import { brandPalette } from "@/lib/brand-colors";
import { StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cancelByClient } from "./actions";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ novo?: string; remarcado?: string }> };

export const metadata = { title: "Seu agendamento" };

export default async function AppointmentPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { novo, remarcado } = await searchParams;
  const a = await db.appointment.findUnique({
    where: { cancelToken: token },
    include: { business: true, service: true, professional: true, client: true },
  });
  if (!a) notFound();
  const b = a.business;

  const check = clientCanChange(b, a, nowInTimezone());
  const active = a.status === "SCHEDULED" || a.status === "CONFIRMED";
  const canReschedule = check.allowed && b.clientCanReschedule && hasAccess(b);
  const when = `${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}`;
  const canceled = a.status === "CANCELED";
  const title = canceled ? "Agendamento cancelado" : remarcado ? "Horário alterado!" : novo === "1" ? "Agendamento realizado!" : "Seu agendamento";

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12" style={brandPalette(b.brandColor) as React.CSSProperties}>
      <div className="card mx-auto w-full max-w-md overflow-hidden">
        <div className={`px-6 py-7 text-center ${canceled ? "bg-zinc-100" : "bg-gradient-to-br from-navy-900 to-navy-700 text-white"}`}>
          {b.logoImageId && !canceled ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/i/${b.logoImageId}`} alt="" className="mx-auto h-14 w-14 rounded-2xl bg-white object-cover ring-2 ring-white/30" />
          ) : (
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${canceled ? "bg-zinc-200 text-zinc-500" : "bg-brand-600 text-white"}`}>
              {canceled ? <X className="h-7 w-7" /> : <Check className="h-7 w-7" strokeWidth={3} />}
            </div>
          )}
          <h1 className={`mt-3 text-2xl font-extrabold ${canceled ? "" : "text-white"}`}>{title}</h1>
          <p className={`mt-0.5 text-sm ${canceled ? "text-zinc-500" : "text-white/75"}`}>{b.name}</p>
        </div>

        <ul className="divide-y divide-zinc-100 px-5 text-sm">
          <Row icon={<CalendarDays className="h-4 w-4" />} label="Quando">
            <span className="inline-block first-letter:uppercase">{when}</span>
          </Row>
          <Row icon={<Scissors className="h-4 w-4" />} label="Serviço">
            {a.service.name} · {formatMoney(a.priceCents)}
          </Row>
          <Row icon={<UserRound className="h-4 w-4" />} label="Profissional">{a.professional.name}</Row>
          {b.address && <Row icon={<MapPin className="h-4 w-4" />} label="Endereço">{b.address}</Row>}
          <Row icon={<Clock className="h-4 w-4" />} label="Status"><StatusBadge status={a.status} /></Row>
        </ul>

        <div className="space-y-2.5 border-t border-zinc-100 p-5">
          {(novo === "1" || remarcado) && !canceled && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-800">
              Guarde este link para consultar{canReschedule ? ", trocar o horário" : ""} ou cancelar.
            </p>
          )}
          {canReschedule && (
            <Link href={`/agendamento/${token}/remarcar`} className="btn-primary w-full">
              <CalendarClock className="h-4 w-4" /> Trocar dia ou horário
            </Link>
          )}
          {b.phone && !canceled && (
            <a
              href={whatsappLink(b.phone, `Olá! Sobre meu horário de ${a.service.name}, ${when}, em nome de ${a.client.name}.`)}
              target="_blank"
              className="btn border border-emerald-200 bg-emerald-50 text-emerald-700 w-full"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          )}
          {check.allowed ? (
            <form action={cancelByClient}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="btn-danger w-full" pendingText="Cancelando...">Cancelar agendamento</SubmitButton>
            </form>
          ) : (
            active && <p className="text-center text-sm text-zinc-500">{check.reason}</p>
          )}
          {check.allowed && b.clientCancelPolicy === "DEADLINE" && (
            <p className="text-center text-xs text-zinc-400">Trocas e cancelamentos pelo link até {deadlineLabel(b.cancelDeadlineMinutes)} antes do horário.</p>
          )}
          <Link href={`/${b.slug}`} className="btn-secondary w-full">
            {canceled ? "Agendar novo horário" : "Fazer outro agendamento"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-zinc-400">{icon}</span>
      <span className="w-24 shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 flex-1 text-right font-medium text-navy-900">{children}</span>
    </li>
  );
}
