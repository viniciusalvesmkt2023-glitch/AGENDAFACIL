import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDateShort, minutesToTime } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { loyaltyCard } from "@/lib/loyalty-sync";
import { loyaltyAdjust } from "@/app/painel/loyalty-actions";
import { LoyaltyCard } from "@/components/public/loyalty-card";
import { ConfirmButton } from "./confirm-button";
import "@/components/public/public.css";
import "../../fidelidade/fidelidade.css";

type Props = { params: Promise<{ id: string }> };
const STATUS: Record<string, string> = { SCHEDULED: "A confirmar", CONFIRMED: "Confirmado", COMPLETED: "Concluído", NO_SHOW: "Faltou", CANCELED: "Cancelado" };

export default async function ClientPage({ params }: Props) {
  const user = await requireActiveUser();
  const { id } = await params;
  const c = await db.client.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      appointments: { include: { service: true, professional: true }, orderBy: [{ date: "desc" }, { startMinutes: "desc" }], take: 30 },
      loyaltyStamps: { orderBy: { createdAt: "desc" }, take: 30, include: { appointment: { select: { service: { select: { name: true } } } } } },
      loyaltyRewards: { orderBy: { createdAt: "desc" }, take: 10, include: { usedOn: { select: { date: true } } } },
    },
  });
  if (!c) notFound();
  const b = user.business;
  const card = await loyaltyCard(b, c.id);
  const done = c.appointments.filter((a) => a.status === "COMPLETED");
  const total = done.reduce((s, a) => s + a.priceCents, 0);

  // histórico do cartão (mais recente primeiro)
  const events = [
    ...c.loyaltyStamps.map((s) => ({
      at: s.createdAt,
      text: `${formatDateShort(s.date)} · ${s.source === "MANUAL" ? "Selo dado na mão" : s.appointment?.service.name ?? "Atendimento"}`,
      tag: s.source === "REMOVED" ? "selo tirado" : s.rewardId ? "+1 selo (virou prêmio)" : "+1 selo",
    })),
    ...c.loyaltyRewards.map((r) => ({
      at: r.usedAt ?? r.createdAt,
      text: r.usedOn ? `${formatDateShort(r.usedOn.date)} · Prêmio usado` : r.usedAt ? "Prêmio removido" : "Prêmio liberado 🎉",
      tag: r.label,
    })),
  ]
    .sort((a, z) => z.at.getTime() - a.at.getTime())
    .slice(0, 15);

  return (
    <div className="space-y-4">
      <Link href="/painel/clientes" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>
      <div className="card flex items-center gap-3 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-50 font-display text-lg font-bold text-navy-700">{c.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold text-navy-900">{c.name}</h1>
          <p className="text-sm text-zinc-500">
            {formatPhone(c.phone)} · {done.length} visita{done.length === 1 ? "" : "s"}
            {total > 0 && ` · ${formatMoney(total)}`}
          </p>
        </div>
        <a href={whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}!`)} target="_blank" rel="noopener noreferrer" className="btn-icon border-emerald-200 bg-emerald-50 text-emerald-700" aria-label="WhatsApp">
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <section className="card p-4" aria-label="Cartão fidelidade">
          <h2 className="text-lg font-bold">Cartão fidelidade</h2>
          {!card ? (
            <p className="mt-2 text-sm text-zinc-500">
              O cartão fidelidade está desligado. Ligue em <Link href="/painel/fidelidade" className="font-semibold text-brand-700">Cartão fidelidade</Link>.
            </p>
          ) : (
            <>
              <LoyaltyCard business={b.name} {...card} />
              <div className="fd-acts">
                <form action={loyaltyAdjust}>
                  <input type="hidden" name="clientId" value={c.id} />
                  <input type="hidden" name="op" value="add" />
                  <button className="btn-secondary btn-sm" data-testid="stamp-add">
                    <Plus className="h-4 w-4" /> Dar selo
                  </button>
                </form>
                <form action={loyaltyAdjust}>
                  <input type="hidden" name="clientId" value={c.id} />
                  <input type="hidden" name="op" value="remove" />
                  <button className="btn-secondary btn-sm" disabled={card.count === 0} data-testid="stamp-remove">
                    <Minus className="h-4 w-4" /> Tirar um selo
                  </button>
                </form>
                <form action={loyaltyAdjust}>
                  <input type="hidden" name="clientId" value={c.id} />
                  <input type="hidden" name="op" value="reset" />
                  <ConfirmButton disabled={card.count === 0} message={`Zerar os ${card.count} selos de ${c.name.split(" ")[0]}? Os prêmios já liberados continuam.`} testid="stamp-reset">
                    <RotateCcw className="h-4 w-4" /> Zerar cartão
                  </ConfirmButton>
                </form>
                {card.rewards.map((r) => (
                  <form key={r.id} action={loyaltyAdjust}>
                    <input type="hidden" name="clientId" value={c.id} />
                    <input type="hidden" name="op" value="reward-off" />
                    <input type="hidden" name="rewardId" value={r.id} />
                    <ConfirmButton message={`Remover o prêmio “${r.label}” de ${c.name.split(" ")[0]}?`} testid="reward-off" danger>
                      <Trash2 className="h-4 w-4" /> Remover prêmio
                    </ConfirmButton>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">“Dar selo” serve para quem tinha cartão de papel ou para corrigir algo. Para usar o prêmio, toque no atendimento na agenda.</p>
              {events.length > 0 && (
                <div className="fd-hist">
                  {events.map((e, i) => (
                    <div key={i}>
                      <span>{e.text}</span>
                      <b>{e.tag}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
        <section className="card p-4" aria-label="Atendimentos">
          <h2 className="text-lg font-bold">Atendimentos</h2>
          {c.appointments.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nenhum atendimento ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {c.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">
                      {a.loyaltyRewardId ? "🎁 " : ""}
                      {a.service.name}
                    </p>
                    <p className="truncate text-zinc-500">
                      {formatDateShort(a.date)} às {minutesToTime(a.startMinutes)} · {a.professional.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <b className="block">{formatMoney(a.priceCents)}</b>
                    <small className="text-zinc-500">{STATUS[a.status] ?? a.status}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
