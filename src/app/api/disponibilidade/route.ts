import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAvailability } from "@/lib/booking";
import { minutesToTime } from "@/lib/time";
import { hasAccess } from "@/lib/subscription";

// GET /api/disponibilidade?slug=...&serviceId=...&date=YYYY-MM-DD[&professionalId=...][&painel=1]
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const slug = p.get("slug");
  const serviceId = p.get("serviceId");
  const date = p.get("date");
  if (!slug || !serviceId || !date) {
    return NextResponse.json({ error: "Parâmetros obrigatórios: slug, serviceId, date" }, { status: 400 });
  }

  const business = await db.business.findUnique({ where: { slug } });
  if (!business) return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
  if (!hasAccess(business)) return NextResponse.json({ slots: [] });

  // O dono logado pode ver horários fora da janela de agendamento online (encaixes)
  let enforceWindow = true;
  let owner = false;
  if (p.get("painel") === "1") {
    const session = await getSession();
    if (session?.businessId === business.id) {
      enforceWindow = false;
      owner = true;
    }
  }

  // Remarcação: o próprio agendamento não ocupa o horário (cliente pelo token; dono pelo id)
  let excludeAppointmentId: string | undefined;
  const token = p.get("token");
  const appointmentId = p.get("appointmentId");
  if (token || (owner && appointmentId)) {
    const appt = await db.appointment.findFirst({
      where: { businessId: business.id, ...(token ? { cancelToken: token } : { id: appointmentId! }) },
      select: { id: true },
    });
    excludeAppointmentId = appt?.id;
  }

  const slots = await getAvailability({
    business,
    serviceId,
    date,
    professionalId: p.get("professionalId") || null,
    enforceWindow,
    excludeAppointmentId,
  });

  return NextResponse.json({
    slots: slots.map((s) => ({ time: s.time, label: minutesToTime(s.time) })),
  });
}
