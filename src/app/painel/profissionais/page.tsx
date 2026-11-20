import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { toggleProfessional } from "../actions";
import { ProfessionalForm } from "./professional-form";

type Props = { searchParams: Promise<{ editar?: string }> };

export default async function ProfessionalsPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const [professionals, services] = await Promise.all([
    db.professional.findMany({
      where: { businessId: user.businessId },
      include: { services: { include: { service: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    db.service.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const editing = params.editar ? professionals.find((p) => p.id === params.editar) : undefined;

  return (
    <>
      <PageHeader title="Profissionais" description="Sua equipe e os serviços que cada um realiza." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {professionals.length === 0 ? (
            <EmptyState title="Nenhum profissional cadastrado." />
          ) : (
            <ul className="card divide-y divide-zinc-100">
              {professionals.map((p) => (
                <li key={p.id} className={`flex items-center gap-4 p-4 ${p.active ? "" : "opacity-50"}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.name} {!p.active && <span className="text-xs font-normal text-zinc-500">(inativo)</span>}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {p.phone ? `${formatPhone(p.phone)} · ` : ""}
                      {p.services.length ? p.services.map((s) => s.service.name).join(", ") : "Nenhum serviço"}
                    </p>
                  </div>
                  <Link href={`/painel/profissionais?editar=${p.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                    Editar
                  </Link>
                  <form action={toggleProfessional}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-secondary px-3 py-1.5 text-xs">{p.active ? "Desativar" : "Ativar"}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          <ProfessionalForm
            key={editing?.id ?? "new"}
            services={services}
            professional={
              editing && {
                id: editing.id,
                name: editing.name,
                phone: editing.phone,
                serviceIds: editing.services.map((s) => s.serviceId),
              }
            }
          />
          {editing && (
            <Link href="/painel/profissionais" className="block text-center text-sm text-zinc-500 hover:underline">
              Cancelar edição
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
