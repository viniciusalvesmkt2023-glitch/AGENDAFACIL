import Link from "next/link";
import { CalendarDays, Check, Clock, ExternalLink, Camera, MessageCircle, PartyPopper, Scissors } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { appUrl } from "@/lib/brand";
import { WEEKDAYS_SHORT } from "@/lib/time";
import { CopyButton, ShareLinkButton } from "@/components/copy-button";

export default async function ReadyPage() {
  const user = await requireActiveUser();
  const b = user.business;
  const [services, hours] = await Promise.all([
    db.service.count({ where: { businessId: b.id, active: true } }),
    db.workingHour.findMany({ where: { businessId: b.id, isOpen: true }, orderBy: { weekday: "asc" } }),
  ]);
  const path = `/${b.slug}`;
  const url = `${appUrl()}${path}`;
  const shareText = `Agora você pode agendar seu horário na ${b.name} pelo link: ${url}`;
  const connected = b.whatsappStatus === "CONNECTED";
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => hours.some((h) => h.weekday === d)).map((d) => WEEKDAYS_SHORT[d]);

  const checklist = [
    { ok: services > 0, icon: Scissors, text: `${services} ${services === 1 ? "serviço cadastrado" : "serviços cadastrados"}`, href: "/painel/servicos" },
    { ok: days.length > 0, icon: Clock, text: days.length ? `Atende ${days.join(", ")}` : "Nenhum dia de atendimento", href: "/painel/horarios" },
    {
      ok: connected,
      icon: MessageCircle,
      text: connected ? "WhatsApp conectado: lembretes ligados" : "WhatsApp não conectado (sem lembretes)",
      href: "/painel/whatsapp",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
          <PartyPopper className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">Sua agenda está no ar!</h1>
        <p className="mx-auto mt-1 max-w-md text-zinc-600">Mande o link para seus clientes. Eles escolhem o serviço e o horário sozinhos, 24h por dia.</p>
      </div>

      <section className="card p-4 md:p-5">
        <p className="text-sm font-medium text-zinc-500">Seu link de agendamento</p>
        <p className="mt-0.5 break-all font-display text-xl font-extrabold text-navy-900">horaboa.com{path}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b]"
          >
            <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
          </a>
          <CopyButton value={path} label="Copiar link" className="btn-secondary" />
          <ShareLinkButton value={path} title={b.name} className="btn-secondary" label="Compartilhar" />
          <Link href={path} target="_blank" className="btn-secondary">
            <ExternalLink className="h-4 w-4" /> Ver minha página
          </Link>
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold">Dicas para encher a agenda</h2>
        <ul className="mt-3 space-y-3 text-sm text-zinc-700">
          <li className="flex gap-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span>Coloque o link na <strong>bio do Instagram</strong> e nos destaques.</span>
          </li>
          <li className="flex gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span>Poste no <strong>status do WhatsApp</strong> e use como resposta rápida quando alguém pedir horário.</span>
          </li>
        </ul>
      </section>

      <section className="card divide-y divide-zinc-100">
        {checklist.map(({ ok, icon: Icon, text, href }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 active:bg-zinc-50">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {ok ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-navy-900">{text}</span>
            <span className="text-xs font-semibold text-brand-700">{ok ? "Editar" : "Resolver"}</span>
          </Link>
        ))}
      </section>

      <Link href="/painel" className="btn-primary w-full min-h-12 text-base">
        <CalendarDays className="h-5 w-5" /> Ir para minha agenda
      </Link>
    </div>
  );
}
