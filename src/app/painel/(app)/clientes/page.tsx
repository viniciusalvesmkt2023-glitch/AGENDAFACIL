import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/time";
import { formatMoney, formatPhone, whatsappLink } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";

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
      <PageHeader title="Clientes" description="Cadastrados automaticamente a cada agendamento." />
      <form className="mb-4 flex gap-2" action="/painel/clientes">
        <input name="busca" defaultValue={term} placeholder="Buscar por nome ou telefone" className="input max-w-sm" />
        <button className="btn-secondary">Buscar</button>
      </form>
      {clients.length === 0 ? (
        <EmptyState title={term ? "Nenhum cliente encontrado." : "Nenhum cliente ainda."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
              <tr>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Telefone</th>
                <th className="p-3 font-medium">Visitas</th>
                <th className="p-3 font-medium">Último agend.</th>
                <th className="p-3 font-medium">Total gasto</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map((c) => {
                const completed = c.appointments.filter((a) => a.status === "COMPLETED");
                const total = completed.reduce((s, a) => s + a.priceCents, 0);
                const last = c.appointments[0]?.date;
                return (
                  <tr key={c.id}>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-zinc-600">{formatPhone(c.phone)}</td>
                    <td className="p-3">{completed.length}</td>
                    <td className="p-3 text-zinc-600">{last ? formatDateShort(last) : "—"}</td>
                    <td className="p-3">{formatMoney(total)}</td>
                    <td className="p-3 text-right">
                      <a
                        href={whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}!`)}
                        target="_blank"
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
