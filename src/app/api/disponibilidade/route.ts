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
  if (!hasAccess(business)) return NextResponse.json({ slots: [], message: "Agendamento online indisponível no momento.", closed: [] });

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

  const day = await getAvailability({
    business,
    serviceId,
    date,
    professionalId: p.get("professionalId") || null,
    enforceWindow,
    excludeAppointmentId,
  });

  // Explica ao cliente por que não há horário (para não parecer erro)
  const pro = p.get("professionalId") ? await db.professional.findFirst({ where: { id: p.get("professionalId")!, businessId: business.id }, select: { name: true } }) : null;
  const who = pro ? pro.name.split(" ")[0] : null;
  const messages: Record<string, string> = {
    CLOSED: who ? `${who} não atende neste dia. Escolha outra data.` : "Não estamos atendendo neste dia. Escolha outra data.",
    PAST: "Os horários de hoje já passaram. Escolha outra data.",
    FULL: "Todos os horários deste dia já foram preenchidos. Escolha outra data.",
    WINDOW: "Esta data ainda não está aberta para agendamento.",
  };

  return NextResponse.json({
    slots: day.slots.map((s) => ({ time: s.time, label: minutesToTime(s.time) })),
    empty: day.empty,
    message: day.empty ? messages[day.empty] : null,
    closed: day.closed.map((c) => `${minutesToTime(c.startMinutes)} às ${minutesToTime(c.endMinutes)}`),
  });
}
