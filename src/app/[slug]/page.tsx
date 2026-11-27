import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { todayInTimezone } from "@/lib/time";
import { whatsappLink } from "@/lib/format";
import { directionsUrl } from "@/lib/links";
import { PublicFooter, PublicFrame, PublicHero } from "@/components/public/frame";
import { openStatus } from "@/lib/open-status";
import { loadClosedDates } from "@/lib/closed-dates";
import { appUrl } from "@/lib/brand";
import { BookingWizard } from "./booking-wizard";
import { hasAccess } from "@/lib/subscription";
import { blockAppliesOn, openWeekdays } from "@/lib/schedule";
import { nowInTimezone, weekdayOf } from "@/lib/time";

type Props = { params: Promise<{ slug: string }> };

async function getBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      workingHours: true,
      services: {
        where: { active: true, professionals: { some: { professional: { active: true } } } },
        orderBy: { name: "asc" },
      },
      professionals: {
        where: { active: true },
        include: { services: { select: { serviceId: true } }, hours: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    select: { name: true, tagline: true, description: true, logoImageId: true, coverImageId: true },
  });
  if (!business) return { title: "Página não encontrada" };
  // Prévia bonita quando o link é enviado no WhatsApp/Instagram (usa a capa ou a logo)
  const image = business.coverImageId ?? business.logoImageId;
  const description = business.tagline ?? business.description ?? `Agende seu horário online em ${business.name}.`;
  return {
    title: `Agende seu horário — ${business.name}`,
    description,
    metadataBase: new URL(appUrl()),
    openGraph: { title: business.name, description, ...(image ? { images: [`/i/${image}`] } : {}) },
    ...(business.logoImageId ? { icons: { icon: `/i/${business.logoImageId}` } } : {}),
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  // Dias bloqueados inteiros (folga, férias, feriado) aparecem como "fechado" na escolha da data
  const today = todayInTimezone();
  const { blocks: fullDayBlocks, closedDatesFor } = await loadClosedDates(business.id, today, business.maxAdvanceDays);

  // "Aberto agora · até 19h" (fechado se houver bloqueio do dia inteiro para todos hoje)
  const now = nowInTimezone();
  const closedToday = fullDayBlocks.some((b) => b.professionalId === null && blockAppliesOn(b, today, weekdayOf(today)));
  const status = business.workingHours.length ? openStatus(business.workingHours, { weekday: weekdayOf(today), minutes: now.minutes }, closedToday) : null;

  return (
    <PublicFrame
      uid="pagina"
      look={{
        theme: business.pageTheme,
        color: business.brandColor,
        glow: business.bgGlow,
        pattern: business.bgPattern,
        coverUrl: business.coverImageId ? `/i/${business.coverImageId}` : null,
      }}
    >
      <PublicHero
        name={business.name}
        tagline={business.tagline}
        description={business.description}
        logoUrl={business.logoImageId ? `/i/${business.logoImageId}` : null}
        status={status}
        whatsappHref={business.phone ? whatsappLink(business.phone, "Olá! Vim pelo seu link de agendamento.") : null}
        instagram={business.instagram}
        directionsHref={business.homeService ? null : directionsUrl(business.mapsUrl, business.address)}
        reviewHref={business.reviewUrl}
      />
      {!hasAccess(business) ? (
        <div className="hb-card hb-glass">
          <p className="hb-empty" style={{ marginTop: 0 }}>
            O agendamento online deste estabelecimento está temporariamente indisponível. Fale direto com o estabelecimento.
          </p>
        </div>
      ) : business.services.length === 0 ? (
        <div className="hb-card hb-glass">
          <p className="hb-empty" style={{ marginTop: 0 }}>Este estabelecimento ainda não disponibilizou serviços para agendamento online.</p>
        </div>
      ) : (
        <BookingWizard
          slug={business.slug}
          today={today}
          maxAdvanceDays={business.maxAdvanceDays}
          services={business.services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            imageUrl: s.imageId ? `/i/${s.imageId}` : null,
          }))}
          professionals={business.professionals.map((p) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageId ? `/i/${p.imageId}` : null,
            serviceIds: p.services.map((s) => s.serviceId),
            openWeekdays: openWeekdays(p, business.workingHours),
            closedDates: closedDatesFor(p.id),
          }))}
        />
      )}
      <PublicFooter />
    </PublicFrame>
  );
}
