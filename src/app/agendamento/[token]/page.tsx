import Link from "next/link";
import { CalendarClock, Check, MessageCircle, Navigation, X } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone } from "@/lib/time";
import { formatMoney, whatsappLink } from "@/lib/format";
import { clientCanChange, deadlineLabel } from "@/lib/policy";
import { hasAccess } from "@/lib/subscription";
import { directionsUrl } from "@/lib/links";
import { STATUS_LABELS } from "@/components/ui";
import { PublicFooter, PublicFrame } from "@/components/public/frame";
import { cancelByClient } from "./actions";
import { CancelButton } from "./cancel-button";

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
  const directions = b.homeService ? null : directionsUrl(b.mapsUrl, b.address);
  const title = canceled
    ? "Agendamento cancelado"
    : remarcado
      ? "Horário alterado!"
      : novo === "1"
        ? "Agendamento confirmado!"
        : "Seu agendamento";

  return (
    <PublicFrame
      uid="agendamento"
      look={{ theme: b.pageTheme, color: b.brandColor, glow: b.bgGlow, pattern: b.bgPattern }}
    >
      <div style={{ paddingTop: 28 }}>
        <Link href={`/${b.slug}`} className="hb-hero" style={{ display: "block", padding: "0 20px", textDecoration: "none" }}>
          <div className="hb-ring" style={{ width: 64, height: 64, borderRadius: 20 }}>
            {b.logoImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="hb-logo" style={{ borderRadius: 17 }} src={`/i/${b.logoImageId}`} alt={`Logo ${b.name}`} />
            ) : (
              <div className="hb-logo" style={{ borderRadius: 17, fontSize: 28 }}>{b.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <p className="hb-tag" style={{ marginTop: 10, fontWeight: 600 }}>{b.name}</p>
        </Link>

        <section className="hb-card hb-glass">
          <div className="hb-done">
            <div className={`hb-ok ${canceled ? "off" : ""}`}>{canceled ? <X className="h-8 w-8" /> : <Check className="h-8 w-8" strokeWidth={3} />}</div>
            <h1 className="hb-title">{title}</h1>
            <p className="first-letter:uppercase">{when}</p>
          </div>

          <div className="hb-summary">
            <div><span>Serviço</span><b>{a.service.name}</b></div>
            <div><span>Profissional</span><b>{a.professional.name}</b></div>
            <div><span>Valor</span><b>{formatMoney(a.priceCents)}</b></div>
            {(b.homeService || b.address) && <div><span>Local</span><b>{b.homeService ? "Atendimento a domicílio" : b.address}</b></div>}
            <div><span>Status</span><b>{STATUS_LABELS[a.status]?.label ?? a.status}</b></div>
          </div>

          {(novo === "1" || remarcado) && !canceled && (
            <p className="hb-legal" style={{ textAlign: "center" }}>
              Você vai receber a confirmação no WhatsApp. Guarde este link para consultar{canReschedule ? ", trocar o horário" : ""} ou cancelar.
            </p>
          )}

          {canReschedule && (
            <Link href={`/agendamento/${token}/remarcar`} className="hb-primary">
              <CalendarClock className="h-5 w-5" /> Trocar dia ou horário
            </Link>
          )}
          {directions && !canceled && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="hb-ghost">
              <Navigation className="h-4 w-4" /> Como chegar
            </a>
          )}
          {b.phone && !canceled && (
            <a
              href={whatsappLink(b.phone, `Olá! Sobre meu horário de ${a.service.name}, ${when}, em nome de ${a.client.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="hb-ghost"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          )}
          {check.allowed ? (
            <form action={cancelByClient}>
              <input type="hidden" name="token" value={token} />
              <CancelButton />
            </form>
          ) : (
            active && <p className="hb-legal" style={{ textAlign: "center" }}>{check.reason}</p>
          )}
          {check.allowed && b.clientCancelPolicy === "DEADLINE" && (
            <p className="hb-legal" style={{ textAlign: "center" }}>
              Trocas e cancelamentos pelo link até {deadlineLabel(b.cancelDeadlineMinutes)} antes do horário.
            </p>
          )}
          <Link href={`/${b.slug}`} className="hb-ghost">
            {canceled ? "Agendar novo horário" : "Fazer outro agendamento"}
          </Link>
        </section>
        <PublicFooter />
      </div>
    </PublicFrame>
  );
}
