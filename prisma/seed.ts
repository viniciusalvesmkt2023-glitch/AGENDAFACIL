// Cria um estabelecimento de demonstração: /barbearia-demo
// Login: demo@agendafacil.com / demo1234
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function main() {
  await db.business.deleteMany({ where: { slug: "barbearia-demo" } });
  await db.user.deleteMany({ where: { email: "demo@agendafacil.com" } });

  const business = await db.business.create({
    data: {
      name: "Barbearia Demo",
      slug: "barbearia-demo",
      phone: "11999999999",
      address: "Rua das Flores, 123 - Centro, São Paulo",
      description: "Cortes clássicos e modernos, barba e muito mais.",
      workingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          isOpen: weekday !== 0,
          startMinutes: 9 * 60,
          endMinutes: weekday === 6 ? 15 * 60 : 20 * 60,
          breakStart: weekday === 6 ? null : 12 * 60,
          breakEnd: weekday === 6 ? null : 13 * 60,
        })),
      },
    },
  });

  await db.user.create({
    data: {
      name: "Dono Demo",
      email: "demo@agendafacil.com",
      passwordHash: await bcrypt.hash("demo1234", 10),
      businessId: business.id,
    },
  });

  const services = await Promise.all(
    [
      { name: "Corte masculino", durationMinutes: 30, priceCents: 4500, description: "Corte na tesoura ou máquina." },
      { name: "Barba", durationMinutes: 30, priceCents: 3500, description: "Barba com toalha quente." },
      { name: "Corte + barba", durationMinutes: 60, priceCents: 7000, description: null },
      { name: "Sobrancelha", durationMinutes: 15, priceCents: 1500, description: null },
    ].map((s) => db.service.create({ data: { ...s, businessId: business.id } })),
  );

  const [carlos, rafael] = await Promise.all(
    ["Carlos", "Rafael"].map((name) =>
      db.professional.create({
        data: {
          name,
          businessId: business.id,
          services: { create: services.map((s) => ({ serviceId: s.id })) },
        },
      }),
    ),
  );

  const today = todayInSaoPaulo();
  const clients = await Promise.all(
    [
      ["João Silva", "5511988887777"],
      ["Pedro Santos", "5511977776666"],
      ["Lucas Oliveira", "5511966665555"],
    ].map(([name, phone]) => db.client.create({ data: { name, phone, businessId: business.id } })),
  );

  const samples = [
    { pro: carlos, service: services[0], client: clients[0], start: 14 * 60, status: "CONFIRMED" },
    { pro: carlos, service: services[2], client: clients[1], start: 15 * 60, status: "SCHEDULED" },
    { pro: rafael, service: services[1], client: clients[2], start: 16 * 60, status: "SCHEDULED" },
  ];
  for (const s of samples) {
    await db.appointment.create({
      data: {
        businessId: business.id,
        professionalId: s.pro.id,
        serviceId: s.service.id,
        clientId: s.client.id,
        date: today,
        startMinutes: s.start,
        endMinutes: s.start + s.service.durationMinutes,
        priceCents: s.service.priceCents,
        status: s.status,
        source: "MANUAL",
      },
    });
  }

  console.log("✔ Demo criada: http://localhost:3000/barbearia-demo");
  console.log("  Login do painel: demo@agendafacil.com / demo1234");
}

main().finally(() => db.$disconnect());
