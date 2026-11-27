import { CalendarOff, Plus, Repeat, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { isValidDate, todayInTimezone } from "@/lib/time";
import { blockWhen } from "@/lib/blocks";
import { EmptyState, PageHeader } from "@/components/ui";
import Link from "next/link";
import { FormModal, SavedToast } from "@/components/form-modal";
import { BlockForm } from "./block-form";
import { deleteBlock } from "./actions";

type Props = { searchParams: Promise<{ data?: string; novo?: string }> };

export default async function BlocksPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const { data, novo } = await searchParams;
  const today = todayInTimezone();
  const [professionals, blocks] = await Promise.all([
    db.professional.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // Só os que ainda valem (os que já passaram somem da lista)
    db.timeBlock.findMany({
      where: {
        businessId: user.businessId,
        OR: [{ endDate: { gte: today } }, { endDate: null, kind: "WEEKLY" }, { endDate: null, date: { gte: today } }],
      },
      include: { professional: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
    }),
  ]);
  const once = blocks.filter((b) => b.kind === "ONCE");
  const weekly = blocks.filter((b) => b.kind === "WEEKLY").sort((a, b) => ((a.weekday ?? 0) + 6) % 7 - ((b.weekday ?? 0) + 6) % 7);

  const List = ({ items, icon }: { items: typeof blocks; icon: React.ReactNode }) => (
    <ul className="card divide-y divide-zinc-100 overflow-hidden">
      {items.map((b) => (
        <li key={b.id} className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-500">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy-900 first-letter:uppercase">{blockWhen(b)}</p>
            <p className="truncate text-sm text-zinc-500">
              {b.professional?.name ?? "Todos"}
              {b.reason && ` · ${b.reason}`}
            </p>
          </div>
          <form action={deleteBlock}>
            <input type="hidden" name="id" value={b.id} />
            <button className="btn-icon text-red-600" aria-label="Remover bloqueio" title="Remover">
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <SavedToast />
      <PageHeader
        title="Bloqueios"
        description="Folgas, férias e compromissos. Horários bloqueados somem do seu link de agendamento."
        action={
          <Link href="/painel/bloqueios?novo=1" scroll={false} className="pn-btn pn-g-brand" data-testid="new-block">
            <Plus /> <span className="hidden sm:inline">Novo bloqueio</span><span className="sm:hidden">Novo</span>
          </Link>
        }
      />
      {(novo || data) && (
        <FormModal icon={<CalendarOff />} title="Novo bloqueio" subtitle="Ninguém consegue marcar nesse horário." closeHref="/painel/bloqueios">
          <BlockForm professionals={professionals} today={today} defaultDate={data && isValidDate(data) && data >= today ? data : today} />
        </FormModal>
      )}
        <div className="space-y-5">
          {blocks.length === 0 ? (
            <EmptyState title="Nenhum bloqueio" icon={<CalendarOff className="h-6 w-6" />}>
              Vai tirar folga, viajar ou tem um compromisso? Bloqueie o horário para ninguém marcar.
              <Link href="/painel/bloqueios?novo=1" scroll={false} className="pn-btn pn-g-brand mt-4"><Plus /> Novo bloqueio</Link>
            </EmptyState>
          ) : (
            <>
              {once.length > 0 && (
                <section>
                  <h2 className="mb-2 font-display text-lg font-bold">Próximos</h2>
                  <List items={once} icon={<CalendarOff className="h-5 w-5" />} />
                </section>
              )}
              {weekly.length > 0 && (
                <section>
                  <h2 className="mb-2 font-display text-lg font-bold">Toda semana</h2>
                  <List items={weekly} icon={<Repeat className="h-5 w-5" />} />
                </section>
              )}
            </>
          )}
        </div>
    </>
  );
}
