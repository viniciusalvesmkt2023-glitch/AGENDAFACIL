import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { todayInTimezone } from "@/lib/time";
import { whatsappLink } from "@/lib/format";
import { brandPalette } from "@/lib/brand-colors";
import { directionsUrl } from "@/lib/links";
import { PublicHeader } from "@/components/public-header";
import { appUrl } from "@/lib/brand";
import { BookingWizard } from "./booking-wizard";
import { hasAccess } from "@/lib/subscription";
import { blockAppliesOn, openWeekdays } from "@/lib/schedule";
import { addDays, weekdayOf } from "@/lib/time";

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

  // Dias bloqueados inteiros (folga, férias, feriado) aparecem como "Fechado" na escolha da data
  const today = todayInTimezone();
  const lastDay = addDays(today, business.maxAdvanceDays);
  const fullDayBlocks = await db.timeBlock.findMany({
    where: { businessId: business.id, startMinutes: null, date: { lte: lastDay }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
  });
  const days = Array.from({ length: business.maxAdvanceDays + 1 }, (_, i) => addDays(today, i));
  const closedDatesFor = (proId: string) =>
    days.filter((d) => fullDayBlocks.some((b) => (b.professionalId === null || b.professionalId === proId) && blockAppliesOn(b, d, weekdayOf(d))));


  return (
    // A cor escolhida pelo estabelecimento substitui o laranja padrão em toda a página
    <div className="min-h-screen bg-zinc-50" style={brandPalette(business.brandColor) as React.CSSProperties}>
      <PublicHeader
        name={business.name}
        tagline={business.tagline}
        description={business.description}
        address={business.address}
        homeService={business.homeService}
        whatsappHref={business.phone ? whatsappLink(business.phone, "Olá! Vim pelo seu link de agendamento.") : null}
        instagram={business.instagram}
        directionsHref={directionsUrl(business.mapsUrl, business.address)}
        reviewHref={business.reviewUrl}
        logoUrl={business.logoImageId ? `/i/${business.logoImageId}` : null}
        coverUrl={business.coverImageId ? `/i/${business.coverImageId}` : null}
      />
      <main className="mx-auto mt-5 max-w-3xl px-4 pb-16">
        {!hasAccess(business) ? (
          <div className="card p-8 text-center text-zinc-500">
            O agendamento online deste estabelecimento está temporariamente indisponível. Entre em contato diretamente.
          </div>
        ) : business.services.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500">
            Este estabelecimento ainda não disponibilizou serviços para agendamento online.
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
            }))}
            professionals={business.professionals.map((p) => ({
              id: p.id,
              name: p.name,
              serviceIds: p.services.map((s) => s.serviceId),
              openWeekdays: openWeekdays(p, business.workingHours),
              closedDates: closedDatesFor(p.id),
            }))}
          />
        )}
        <p className="mt-8 text-center text-xs text-zinc-400">
          Agendamento online por{" "}
          <a href="/" className="font-display font-extrabold">
            <span className="text-navy-900">Hora</span><span className="text-[#FE6E02]">Boa</span>
          </a>
        </p>
      </main>
    </div>
  );
}
