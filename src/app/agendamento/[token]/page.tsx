import Link from "next/link";
import { CalendarClock, CalendarPlus, Navigation } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong, minutesToTime, nowInTimezone } from "@/lib/time";
import { formatMoney } from "@/lib/format";
import { clientCanChange, deadlineLabel } from "@/lib/policy";
import { hasAccess } from "@/lib/subscription";
import { directionsUrl } from "@/lib/links";
import { afterBookingFrame, PublicFooter, PublicFrame } from "@/components/public/frame";
import { Confetti } from "@/components/public/confetti";
import { cancelByClient } from "./actions";
import { CancelButton } from "./cancel-button";
import { loyaltyCard } from "@/lib/loyalty-sync";
import { LoyaltyCard } from "@/components/public/loyalty-card";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ novo?: string; remarcado?: string }> };

export const metadata = { title: "Seu agendamento" };

export default async function AppointmentPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { novo, remarcado } = await searchParams;
  const a = await db.appointment.findUnique({
    where: { cancelToken: token },
    include: { business: true, service: true, professional: true },
  });
  if (!a) notFound();
  const b = a.business;

  const check = clientCanChange(b, a, nowInTimezone());
  const canceled = a.status === "CANCELED";
  const active = a.status === "SCHEDULED" || a.status === "CONFIRMED";
  const canReschedule = check.allowed && b.clientCanReschedule && hasAccess(b);
  const when = `${formatDateLong(a.date)} às ${minutesToTime(a.startMinutes)}`;
  const directions = b.homeService ? null : directionsUrl(b.mapsUrl, b.address);
  const celebrate = !canceled && (novo === "1" || remarcado === "1");
  const pending = a.status === "SCHEDULED";
  const card = !canceled ? await loyaltyCard(b, a.clientId) : null;

  return (
    // Padrão das telas depois de agendar: claro ou escuro conforme o tema do estabelecimento
    <PublicFrame uid="agendamento" {...afterBookingFrame(b.pageTheme, b.brandColor)}>
      {celebrate && <Confetti />}
      <div style={{ paddingTop: 26 }}>
        <Link href={`/${b.slug}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none" }}>
          <div className="hb-ring" style={{ width: 56, height: 56, borderRadius: 18, padding: 2 }}>
            {b.logoImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="hb-logo" style={{ borderRadius: 16 }} src={`/i/${b.logoImageId}`} alt={`Logo ${b.name}`} />
            ) : (
              <div className="hb-logo" style={{ borderRadius: 16, fontSize: 24 }}>{b.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <p className="hb-tag" style={{ marginTop: 8, fontWeight: 600, fontSize: 14 }}>{b.name}</p>
        </Link>

        <section className="hb-card hb-glass">
          {canceled ? (
            <div className="hb-status">
              <div className="hb-canceled">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
                  <path d="M7 7l10 10" />
                  <path d="M17 7 7 17" />
                </svg>
              </div>
              <h1>Agendamento cancelado</h1>
              <p>
                Seu horário de {a.service.name} em {when} foi cancelado. Quando quiser, é só marcar de novo.
              </p>
            </div>
          ) : (
            <div className="hb-status">
              <div className="hb-success">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </div>
              <h1>{pending ? (remarcado ? "Pedido de troca enviado!" : "Pedido enviado!") : remarcado ? "Horário alterado!" : "Agendamento confirmado!"}</h1>
              <p>{when}</p>
              {pending && (
                <p className="hb-pending" data-testid="pending-note">
                  ⏳ Aguardando a confirmação de {b.name}. Você recebe a confirmação no WhatsApp.
                </p>
              )}
            </div>
          )}

          <div className="hb-summary">
            <div><span>Serviço</span><b>{a.service.name}</b></div>
            <div><span>Profissional</span><b>{a.professional.name}</b></div>
            {!canceled && <div><span>Valor</span><b>{formatMoney(a.priceCents)}</b></div>}
            {!canceled && (b.homeService || b.address) && (
              <div><span>Local</span><b>{b.homeService ? "Atendimento a domicílio" : b.address}</b></div>
            )}
          </div>

          {canceled ? (
            <Link href={`/${b.slug}`} className="hb-btn hb-btn-green hb-pulse" style={{ marginTop: 18 }}>
              <CalendarPlus /> Agendar novo horário
            </Link>
          ) : (
            <>
              {card && <LoyaltyCard business={b.name} {...card} />}
              {(novo === "1" || remarcado) && !pending && (
                <p className="hb-legal" style={{ textAlign: "center" }}>
                  A confirmação foi enviada para o seu WhatsApp. Pelo link dela você volta aqui quando quiser.
                </p>
              )}
              {canReschedule && (
                <Link href={`/agendamento/${token}/remarcar`} className="hb-btn hb-btn-green" style={{ marginTop: 16 }}>
                  <CalendarClock /> Trocar dia ou horário
                </Link>
              )}
              {directions && (
                <a href={directions} target="_blank" rel="noopener noreferrer" className="hb-btn hb-btn-blue">
                  <Navigation /> Como chegar
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
            </>
          )}
        </section>
        <PublicFooter />
      </div>
    </PublicFrame>
  );
}
