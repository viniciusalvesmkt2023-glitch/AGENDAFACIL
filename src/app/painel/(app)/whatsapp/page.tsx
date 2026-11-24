import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { evolutionConfigured } from "@/lib/evolution";
import { formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ConnectPanel } from "./connect-panel";
import { MessagesForm, TestMessageForm } from "./messages-form";
import { disconnectWhatsapp } from "./actions";

const TYPES: Record<string, string> = { CONFIRMATION: "Confirmação", REMINDER_DAY: "Lembrete antecipado", REMINDER_SHORT: "Lembrete" };

export default async function WhatsappPage() {
  const user = await requireActiveUser();
  const b = user.business;
  const configured = evolutionConfigured();
  const messages = await db.messageLog.findMany({ where: { businessId: b.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const connected = b.whatsappStatus === "CONNECTED";

  return (
    <>
      <PageHeader title="WhatsApp" description="Confirmações e lembretes automáticos enviados do WhatsApp do seu estabelecimento." />

      <section className="card mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Conexão</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              connected ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-zinc-100 text-zinc-600 ring-zinc-200"
            }`}
          >
            {connected ? "Conectado" : b.whatsappStatus === "CONNECTING" ? "Aguardando leitura do QR code" : "Desconectado"}
          </span>
        </div>

        {!configured ? (
          <p className="text-sm text-amber-700">O envio de WhatsApp ainda está sendo configurado na plataforma. Volte em breve.</p>
        ) : connected ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              Conectado ao número <strong>{b.whatsappNumber ? formatPhone(b.whatsappNumber) : "—"}</strong>. As mensagens
              automáticas saem deste WhatsApp.
            </p>
            <TestMessageForm defaultPhone={b.phone ?? ""} />
            <form action={disconnectWhatsapp}>
              <button className="btn-danger">Desconectar WhatsApp</button>
            </form>
          </div>
        ) : (
          <ConnectPanel connecting={b.whatsappStatus === "CONNECTING"} />
        )}
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Mensagens automáticas</h2>
        <MessagesForm
          enabled={b.whatsappRemindersEnabled}
          confirmationEnabled={b.confirmationEnabled}
          dayMode={b.reminderDayMode}
          dayTime={b.reminderDayTime}
          shortMinutes={b.reminderShortMinutes}
          confirmation={b.msgConfirmation}
          reminder={b.msgReminder}
          businessName={b.name}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">Boas práticas para não ter o número bloqueado</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>Use um número que já tenha conversas e histórico (números novos são mais vigiados).</li>
          <li>O sistema só envia mensagens a quem agendou — não use este WhatsApp para propagandas em massa.</li>
          <li>Mantenha o celular com internet de vez em quando para a conexão continuar ativa.</li>
        </ul>
      </section>

      {messages.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Últimas mensagens</h2>
          <ul className="card divide-y divide-zinc-100 text-sm">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{fmt.format(m.createdAt)} · {TYPES[m.type] ?? m.type} · {formatPhone(m.to)}</span>
                <span className={m.status === "SENT" ? "text-emerald-700" : "text-red-600"}>{m.status === "SENT" ? "Enviada" : "Falhou"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
