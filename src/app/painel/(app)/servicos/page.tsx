import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDuration, formatMoney } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
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
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">Bem-vindo ao HoraBoa! 🎉</p>
          <p className="mt-1">
            Para começar a receber agendamentos: <strong>1)</strong> cadastre seus serviços aqui,{" "}
            <strong>2)</strong> confira sua equipe em <Link className="underline" href="/painel/profissionais">Profissionais</Link>,{" "}
            <strong>3)</strong> ajuste os <Link className="underline" href="/painel/horarios">Horários</Link> e{" "}
            <strong>4)</strong> compartilhe seu link com os clientes.
          </p>
        </div>
      )}
      <PageHeader title="Serviços" description="O que seus clientes podem agendar, com duração e preço." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {services.length === 0 ? (
            <EmptyState title="Nenhum serviço cadastrado ainda.">Adicione seu primeiro serviço ao lado.</EmptyState>
          ) : (
            <ul className="card divide-y divide-zinc-100">
              {services.map((s) => (
                <li key={s.id} className={`flex items-center gap-4 p-4 ${s.active ? "" : "opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.name} {!s.active && <span className="text-xs font-normal text-zinc-500">(inativo)</span>}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}
                    </p>
                  </div>
                  <Link href={`/painel/servicos?editar=${s.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                    Editar
                  </Link>
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn-secondary px-3 py-1.5 text-xs">{s.active ? "Desativar" : "Ativar"}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          <ServiceForm key={editing?.id ?? "new"} service={editing} />
          {editing && (
            <Link href="/painel/servicos" className="block text-center text-sm text-zinc-500 hover:underline">
              Cancelar edição
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
