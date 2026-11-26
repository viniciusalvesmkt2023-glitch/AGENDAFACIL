import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDuration, formatMoney } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { FormPanel } from "@/components/form-panel";
import { Pencil, Power, Scissors } from "lucide-react";
import { toggleService } from "@/app/painel/actions";
import { ServiceForm } from "./service-form";

type Props = { searchParams: Promise<{ editar?: string; bemvindo?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const services = await db.service.findMany({
    where: { businessId: user.businessId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const editing = params.editar ? services.find((s) => s.id === params.editar) : undefined;

  return (
    <>
      {params.bemvindo && (
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">Bem-vindo ao HoraBoa! 🎉</p>
          <p className="mt-1">
            Para começar a receber agendamentos: <strong>1)</strong> cadastre seus serviços aqui,{" "}
            <strong>2)</strong> confira sua equipe em <Link className="underline" href="/painel/profissionais">Profissionais</Link>,{" "}
            <strong>3)</strong> ajuste os <Link className="underline" href="/painel/horarios">Horários</Link> e{" "}
            <strong>4)</strong> compartilhe seu link com os clientes.
          </p>
        </div>
      )}
      <PageHeader title="Serviços" description="O que seus clientes podem agendar." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 lg:order-2 lg:sticky lg:top-8">
          <FormPanel key={editing?.id ?? "novo"} title={editing ? `Editar: ${editing.name}` : "Novo serviço"} open={!!editing || services.length === 0}>
            <ServiceForm key={editing?.id ?? "new"} service={editing} />
            {editing && (
              <Link href="/painel/servicos" className="mt-3 block text-center text-sm text-zinc-500 hover:underline">
                Cancelar edição
              </Link>
            )}
          </FormPanel>
        </div>
        <div className="min-w-0 lg:order-1">
          {services.length === 0 ? (
            <EmptyState title="Nenhum serviço cadastrado" icon={<Scissors className="h-6 w-6" />}>
              Cadastre o que você oferece, com duração e preço.
            </EmptyState>
          ) : (
            <ul className="card divide-y divide-zinc-100 overflow-hidden">
              {services.map((s) => (
                <li key={s.id} className={`flex items-center gap-3 px-4 py-3 ${s.active ? "" : "opacity-50"}`}>
                  {s.imageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/i/${s.imageId}`} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Scissors className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">
                      {s.name} {!s.active && <span className="text-xs font-normal text-zinc-500">(inativo)</span>}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDuration(s.durationMinutes)} · <span className="font-medium text-zinc-700">{formatMoney(s.priceCents)}</span>
                    </p>
                  </div>
                  <Link href={`/painel/servicos?editar=${s.id}`} className="btn-icon" aria-label={`Editar ${s.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className={`btn-icon ${s.active ? "" : "text-emerald-600"}`} aria-label={s.active ? `Desativar ${s.name}` : `Ativar ${s.name}`} title={s.active ? "Desativar" : "Ativar"}>
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
