import { db } from "@/lib/db";
import { appUrl } from "@/lib/brand";
import { buildIcs } from "@/lib/ics";
import { localToUtc } from "@/lib/time";

// "Adicionar à minha agenda": devolve o horário em formato de calendário (.ics)
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await db.appointment.findUnique({
    where: { cancelToken: token },
    include: { business: true, service: true, professional: true },
  });
  if (!a) return new Response("Agendamento não encontrado", { status: 404 });
  const link = `${appUrl()}/agendamento/${token}`;
  const ics = buildIcs({
    uid: `${a.id}@horaboa.com`,
    start: localToUtc(a.date, a.startMinutes),
    end: localToUtc(a.date, a.endMinutes),
    title: `${a.service.name} · ${a.business.name}`,
    location: a.business.homeService ? "Atendimento a domicílio" : a.business.address,
    description: `Com ${a.professional.name}. Para trocar o horário ou cancelar: ${link}`,
    url: link,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="agendamento-${a.business.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
