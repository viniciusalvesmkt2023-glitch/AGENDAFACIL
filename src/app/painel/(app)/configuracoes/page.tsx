import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireActiveUser();
  const messages = await db.messageLog.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const TYPES: Record<string, string> = { CONFIRMATION: "Confirmação", REMINDER_24H: "Lembrete 24h", REMINDER_2H: "Lembrete 2h" };
  return (
    <>
      <PageHeader title="Configurações" description="Informações do estabelecimento e regras do agendamento online." />
      <SettingsForm business={user.business} />
      {messages.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Últimas mensagens de WhatsApp</h2>
          <ul className="card divide-y divide-zinc-100 text-sm">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{fmt.format(m.createdAt)} · {TYPES[m.type] ?? m.type} · {formatPhone(m.to)}</span>
                <span className={m.status === "SENT" ? "text-emerald-700" : "text-red-600"}>
                  {m.status === "SENT" ? "Enviada" : "Falhou"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
