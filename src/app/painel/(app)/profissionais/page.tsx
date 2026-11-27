import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { FormPanel } from "@/components/form-panel";
import { Clock, Pencil, Power, UserRound } from "lucide-react";
import { toggleProfessional } from "@/app/painel/actions";
import { ProfessionalForm } from "./professional-form";

type Props = { searchParams: Promise<{ editar?: string }> };

export default async function ProfessionalsPage({ searchParams }: Props) {
  const user = await requireActiveUser();
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
      <PageHeader title="Profissionais" description="Sua equipe e os serviços de cada um." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 lg:order-2 lg:sticky lg:top-8">
          <FormPanel key={editing?.id ?? "novo"} title={editing ? `Editar: ${editing.name}` : "Novo profissional"} open={!!editing || professionals.length === 0}>
            <ProfessionalForm
              key={editing?.id ?? "new"}
              services={services}
              professional={
                editing && {
                  id: editing.id,
                  name: editing.name,
                  phone: editing.phone,
                  serviceIds: editing.services.map((s) => s.serviceId),
                  imageId: editing.imageId,
                }
              }
            />
            {editing && (
              <Link href="/painel/profissionais" className="mt-3 block text-center text-sm text-zinc-500 hover:underline">
                Cancelar edição
              </Link>
            )}
          </FormPanel>
        </div>
        <div className="min-w-0 lg:order-1">
          {professionals.length === 0 ? (
            <EmptyState title="Nenhum profissional cadastrado" icon={<UserRound className="h-6 w-6" />} />
          ) : (
            <ul className="card divide-y divide-zinc-100 overflow-hidden">
              {professionals.map((p) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.active ? "" : "opacity-50"}`}>
                  {p.imageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/i/${p.imageId}`} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-900 font-display font-bold text-white">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">
                      {p.name} {!p.active && <span className="text-xs font-normal text-zinc-500">(inativo)</span>}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {p.services.length ? `${p.services.length} serviço${p.services.length === 1 ? "" : "s"}: ${p.services.map((s) => s.service.name).join(", ")}` : "Nenhum serviço"}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {p.customHours ? "Horário próprio" : "Horário do estabelecimento"}
                      {p.phone && ` · ${formatPhone(p.phone)}`}
                    </p>
                  </div>
                  <Link href={`/painel/profissionais/${p.id}/horarios`} className="btn-icon" aria-label={`Horário de ${p.name}`} title="Horário">
                    <Clock className="h-4 w-4" />
                  </Link>
                  <Link href={`/painel/profissionais?editar=${p.id}`} className="btn-icon" aria-label={`Editar ${p.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={toggleProfessional}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className={`btn-icon ${p.active ? "" : "text-emerald-600"}`} aria-label={p.active ? `Desativar ${p.name}` : `Ativar ${p.name}`} title={p.active ? "Desativar" : "Ativar"}>
                      <Power className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
