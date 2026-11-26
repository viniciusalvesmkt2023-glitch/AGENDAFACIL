import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { todayInTimezone } from "@/lib/time";
import { formatPhone, whatsappLink } from "@/lib/format";
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
  const business = await db.business.findUnique({ where: { slug }, select: { name: true } });
  return { title: business ? `Agende seu horário — ${business.name}` : "Página não encontrada" };
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
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-gradient-to-br from-navy-900 to-navy-700 text-white">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold">
            {business.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-white">{business.name}</h1>
          {business.description && <p className="mt-2 text-white/80">{business.description}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
            {business.address && <span>📍 {business.address}</span>}
            {business.phone && (
              <a href={whatsappLink(business.phone, "Olá!")} target="_blank" className="hover:underline">
                📱 {formatPhone(business.phone)}
              </a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-8 max-w-3xl px-4 pb-16">
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
            <span className="text-navy-900">Hora</span><span className="text-brand-500">Boa</span>
          </a>
        </p>
      </main>
    </div>
  );
}
