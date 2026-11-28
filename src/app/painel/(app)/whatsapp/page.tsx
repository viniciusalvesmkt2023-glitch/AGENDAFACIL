import { AlertTriangle, Ban, BellRing, CalendarClock, CheckCircle2, Gift, MessageCircle, Smartphone, TrendingDown, Wifi, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { evolutionConfigured } from "@/lib/evolution";
import { formatPhone } from "@/lib/format";
import { nowInTimezone } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ConnectPanel } from "./connect-panel";
import { MessagesForm, TestMessageForm } from "./messages-form";
import { disconnectWhatsapp } from "./actions";
import "./whatsapp.css";

const TYPES: Record<string, [string, React.ComponentType, string]> = {
  CONFIRMATION: ["Confirmação", CheckCircle2, "linear-gradient(135deg,#4ade80,#16a34a)"],
  REMINDER_DAY: ["Lembrete antecipado", CalendarClock, "linear-gradient(135deg,#60a5fa,#1d4ed8)"],
  REMINDER_SHORT: ["Lembrete", BellRing, "linear-gradient(135deg,#fbbf24,#d97706)"],
  DECLINED: ["Agendamento recusado", XCircle, "linear-gradient(135deg,#f87171,#dc2626)"],
  LOYALTY_STAMP: ["Cartão fidelidade", Gift, "linear-gradient(135deg,#f472b6,#db2777)"],
  LOYALTY_REWARD: ["Prêmio do cartão fidelidade", Gift, "linear-gradient(135deg,#c084fc,#7c3aed)"],
};

function WaLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" />
    </svg>
  );
}

// Conexão por código pode levar alguns segundos (recria a conexão na Evolution)
export const maxDuration = 60;

export default async function WhatsappPage() {
  const user = await requireActiveUser();
  const b = user.business;
  const configured = evolutionConfigured();
  const now = nowInTimezone();
  // início do mês no fuso de São Paulo (UTC-3)
  const monthStart = new Date(`${now.date.slice(0, 7)}-01T03:00:00Z`);
  const [messages, monthLogs] = await Promise.all([
    db.messageLog.findMany({
      where: { businessId: b.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { appointment: { select: { client: { select: { name: true } } } } },
    }),
    db.messageLog.groupBy({ by: ["type", "status"], where: { businessId: b.id, createdAt: { gte: monthStart }, status: { in: ["SENT", "FAILED"] } }, _count: true }),
  ]);
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const connected = b.whatsappStatus === "CONNECTED";
  const sent = monthLogs.filter((g) => g.status === "SENT").reduce((n, g) => n + g._count, 0);
  const total = monthLogs.reduce((n, g) => n + g._count, 0);
  const reminders = monthLogs.filter((g) => g.status === "SENT" && g.type.startsWith("REMINDER")).reduce((n, g) => n + g._count, 0);
  const logoUrl = b.logoImageId ? `/i/${b.logoImageId}` : null;

  return (
    <>
      <PageHeader title="WhatsApp" description="Confirmações e lembretes automáticos enviados do WhatsApp do seu estabelecimento." />

      {connected ? (
        <section className="wz-hero" data-testid="wa-connected">
          <div>
            <div className="wz-hh">
              <span className="wz-wai"><WaLogo /></span>
              <div className="min-w-0"><small>WhatsApp do estabelecimento</small><b>{b.name}</b></div>
              <span className="wz-st ok"><i />Conectado</span>
            </div>
            <p className="wz-num">Mensagens saem do número<b>{b.whatsappNumber ? formatPhone(b.whatsappNumber) : "—"}</b></p>
            <div className="wz-stats">
              <div><b>{sent}</b><small>mensagens no mês</small></div>
              <div><b>{total ? `${Math.round((sent / total) * 100)}%` : "—"}</b><small>entregues</small></div>
              <div><b>{reminders}</b><small>lembretes no mês</small></div>
            </div>
            <div className="wz-acts">
              <TestMessageForm defaultPhone={b.phone ?? ""} />
              <form action={disconnectWhatsapp}>
                <button className="wz-b3">Desconectar</button>
              </form>
            </div>
          </div>
          <div className="wz-chat" aria-hidden="true">
            <div className="wz-ch">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="wz-av">{logoUrl ? <img src={logoUrl} alt="" /> : b.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0"><b className="truncate">{b.name}</b><small>online</small></div>
            </div>
            <div className="wz-cb">
              <div className="wz-bub">Olá, Lia! ✅ Seu horário em <b>{b.name}</b> está confirmado para amanhã às 14:00.<time>10:02</time></div>
              <div className="wz-bub me">Obrigada! 🙏<time>10:03</time></div>
              <div className="wz-bub">Olá, Lia! ⏰ Passando para lembrar do seu horário em <b>{b.name}</b> daqui a 1 hora.<time>13:00</time></div>
            </div>
          </div>
        </section>
      ) : (
        <section className="wz-hero off" data-testid="wa-disconnected">
          <div>
            <div className="wz-hh">
              <span className="wz-wai"><WaLogo /></span>
              <div className="min-w-0"><small>WhatsApp do estabelecimento</small><b>{b.whatsappStatus === "CONNECTING" ? "Quase lá…" : "Conecte em 1 minuto"}</b></div>
              <span className="wz-st off"><i />{b.whatsappStatus === "CONNECTING" ? "Conectando" : "Desconectado"}</span>
            </div>
            {configured ? (
              <ConnectPanel connecting={b.whatsappStatus === "CONNECTING"} defaultPhone={b.phone ?? ""} />
            ) : (
              <p className="wz-p"><AlertTriangle className="mr-1 inline h-4 w-4" /> O envio de WhatsApp ainda está sendo configurado na plataforma. Volte em breve.</p>
            )}
          </div>
          <div className="wz-why">
            <div><span style={{ background: "linear-gradient(135deg,#4ade80,#16a34a)" }}><CheckCircle2 /></span><p className="m-0"><b>Confirmação na hora</b><small>o cliente recebe assim que agenda</small></p></div>
            <div><span style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}><BellRing /></span><p className="m-0"><b>Lembretes automáticos</b><small>na véspera e perto do horário</small></p></div>
            <div><span style={{ background: "linear-gradient(135deg,#60a5fa,#1d4ed8)" }}><TrendingDown /></span><p className="m-0"><b>Menos faltas</b><small>quem é lembrado aparece mais</small></p></div>
          </div>
        </section>
      )}

      <MessagesForm
        enabled={b.whatsappRemindersEnabled}
        confirmationEnabled={b.confirmationEnabled}
        dayMode={b.reminderDayMode}
        dayTime={b.reminderDayTime}
        shortMinutes={b.reminderShortMinutes}
        confirmation={b.msgConfirmation}
        reminder={b.msgReminder}
        businessName={b.name}
        logoUrl={logoUrl}
      />

      {messages.length > 0 && (
        <>
          <div className="wz-sec"><div><h2>Últimas mensagens</h2><small>As {messages.length} mais recentes</small></div></div>
          <div className="wz-hist" data-testid="wa-history">
            {messages.map((m) => {
              const [label, Icon, bg] = TYPES[m.type] ?? [m.type, MessageCircle, "linear-gradient(135deg,#a1a1aa,#52525b)"];
              const ok = m.status === "SENT";
              const name = m.appointment?.client?.name;
              return (
                <div key={m.id} className="wz-hr">
                  <span className="wz-hi" style={{ background: bg }}><Icon /></span>
                  <div className="min-w-0">
                    <b>{label}{name ? ` · ${name}` : ""}</b>
                    <small>{fmt.format(m.createdAt)} · {formatPhone(m.to)}</small>
                  </div>
                  <span className={`wz-pill ${ok ? "ok" : "bad"}`}>{ok ? "Enviada" : m.status === "SKIPPED" ? "Não enviada" : "Falhou"}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="wz-sec"><div><h2>Para não ter o número bloqueado</h2></div></div>
      <div className="wz-tips">
        <div className="wz-tip"><span style={{ background: "linear-gradient(135deg,#60a5fa,#1d4ed8)" }}><Smartphone /></span><b>Use um número com histórico</b><p>Números novos são mais vigiados pelo WhatsApp. Prefira o que você já usa com clientes.</p></div>
        <div className="wz-tip"><span style={{ background: "linear-gradient(135deg,#f87171,#dc2626)" }}><Ban /></span><b>Nada de propaganda em massa</b><p>O sistema só fala com quem agendou. Use este WhatsApp do mesmo jeito.</p></div>
        <div className="wz-tip"><span style={{ background: "linear-gradient(135deg,#4ade80,#16a34a)" }}><Wifi /></span><b>Celular com internet</b><p>Abra o WhatsApp de vez em quando para a conexão continuar ativa.</p></div>
      </div>
    </>
  );
}
