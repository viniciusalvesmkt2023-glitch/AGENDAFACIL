import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BrandingForm } from "./branding-form";

export default async function BrandingPage() {
  const user = await requireActiveUser();
  const b = user.business;
  const services = await db.service.findMany({
    where: { businessId: b.id, active: true },
    orderBy: { name: "asc" },
    take: 3,
    select: { id: true, name: true, durationMinutes: true, priceCents: true, imageId: true },
  });
  return (
    <>
      <PageHeader title="Minha página" description="Deixe seu link de agendamento com a cara do seu negócio." />
      <BrandingForm
        services={services.map((s) => ({ ...s, imageUrl: s.imageId ? `/i/${s.imageId}` : null }))}
        business={{
          name: b.name,
          slug: b.slug,
          phone: b.phone,
          address: b.address,
          homeService: b.homeService,
          brandColor: b.brandColor,
          businessType: b.businessType,
          pageTheme: b.pageTheme,
          bgPattern: b.bgPattern,
          tagline: b.tagline,
          description: b.description,
          instagram: b.instagram,
          mapsUrl: b.mapsUrl,
          reviewUrl: b.reviewUrl,
          logoUrl: b.logoImageId ? `/i/${b.logoImageId}` : null,
          coverUrl: b.coverImageId ? `/i/${b.coverImageId}` : null,
        }}
      />
    </>
  );
}
