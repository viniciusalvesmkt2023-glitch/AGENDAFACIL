import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { MessageCircle, Search, Users } from "lucide-react";

type Props = { searchParams: Promise<{ busca?: string }> };

export default async function ClientsPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const { busca = "" } = await searchParams;
  const term = busca.trim();
  const digits = term.replace(/\D/g, "");

  const clients = await db.client.findMany({
    where: {
      businessId: user.businessId,
      ...(term
        ? { OR: [{ name: { contains: term, mode: "insensitive" as const } }, ...(digits ? [{ phone: { contains: digits } }] : [])] }
        : {}),
    },
    include: {
      appointments: {
        where: { status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] } },
        select: { date: true, priceCents: true, status: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Clientes" description={`${clients.length} cliente${clients.length === 1 ? "" : "s"} · cadastrados a cada agendamento`} />
      <form className="relative mb-4" action="/painel/clientes">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input name="busca" type="search" defaultValue={term} placeholder="Buscar por nome ou telefone" className="input pl-10" />
      </form>
      {clients.length === 0 ? (
        <EmptyState title={term ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"} icon={<Users className="h-6 w-6" />}>
          {term ? "Tente buscar por outro nome ou número." : "Os clientes aparecem aqui assim que fizerem o primeiro agendamento."}
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-zinc-100 overflow-hidden">
          {clients.map((c) => {
            const completed = c.appointments.filter((a) => a.status === "COMPLETED");
            const total = completed.reduce((s, a) => s + a.priceCents, 0);
            const last = c.appointments[0]?.date;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-50 font-display font-bold text-navy-700">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">{c.name}</p>
                  <p className="truncate text-sm text-zinc-500">
                    {formatPhone(c.phone)}
                    <span className="hidden sm:inline"> · </span>
                    <span className="block sm:inline">
                      {completed.length} visita{completed.length === 1 ? "" : "s"}
                      {total > 0 && ` · ${formatMoney(total)}`}
                      {last && ` · último: ${formatDateShort(last)}`}
                    </span>
                  </p>
                </div>
                <a
                  href={whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}!`)}
                  target="_blank"
                  className="btn-icon border-emerald-200 bg-emerald-50 text-emerald-700"
                  aria-label={`WhatsApp de ${c.name}`}
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
