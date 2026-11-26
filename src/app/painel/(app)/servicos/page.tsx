import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatDuration, formatMoney } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { FormPanel } from "@/components/form-panel";
import { Pencil, Plus, Scissors } from "lucide-react";
import { toggleService } from "@/app/painel/actions";
import { ServiceForm } from "./service-form";

type Props = { searchParams: Promise<{ editar?: string; novo?: string; bemvindo?: string }> };

// Cor do cartão quando o serviço não tem foto
const PLACEHOLDERS = [
  "linear-gradient(135deg,#3f3f46,#18181b)",
  "linear-gradient(135deg,#92400e,#451a03)",
  "linear-gradient(135deg,#1e3a8a,#0f172a)",
  "linear-gradient(135deg,#065f46,#022c22)",
  "linear-gradient(135deg,#6b21a8,#2e1065)",
  "linear-gradient(135deg,#9f1239,#4c0519)",
];

export default async function ServicesPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const services = await db.service.findMany({
    where: { businessId: user.businessId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  // Sem serviços: já abre o formulário (pelo endereço, para ele continuar aberto depois de salvar o primeiro)
  if (services.length === 0 && !params.novo) redirect(`/painel/servicos?novo=1${params.bemvindo ? "&bemvindo=1" : ""}`);
  const editing = params.editar ? services.find((s) => s.id === params.editar) : undefined;
  const showForm = !!editing || !!params.novo;

  return (
    <div className="space-y-4">
      {params.bemvindo && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">Bem-vindo ao HoraBoa! 🎉</p>
          <p className="mt-1">
            Para começar a receber agendamentos: <strong>1)</strong> cadastre seus serviços aqui,{" "}
            <strong>2)</strong> confira sua equipe em <Link className="underline" href="/painel/profissionais">Profissionais</Link>,{" "}
            <strong>3)</strong> ajuste os <Link className="underline" href="/painel/horarios">Horários</Link> e{" "}
            <strong>4)</strong> compartilhe seu link com os clientes.
          </p>
        </div>
      )}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="pn-h1">Serviços</h1>
          <p className="pn-hello">O que seus clientes podem agendar</p>
        </div>
        {!showForm && (
          <Link href="/painel/servicos?novo=1" className="pn-btn pn-g-brand shrink-0">
            <Plus /> Novo
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        {showForm && (
          <div className="min-w-0 lg:order-2 lg:sticky lg:top-8">
            <FormPanel key={editing?.id ?? "novo"} title={editing ? `Editar: ${editing.name}` : "Novo serviço"} open>
              <ServiceForm key={editing?.id ?? "new"} service={editing} />
              {(editing || services.length > 0) && (
                <Link href="/painel/servicos" className="mt-3 block text-center text-sm text-zinc-500 hover:underline">
                  {editing ? "Cancelar edição" : "Fechar"}
                </Link>
              )}
            </FormPanel>
          </div>
        )}
        <div className={`min-w-0 lg:order-1 ${showForm ? "" : "lg:col-span-2"}`}>
          {services.length === 0 ? (
            <EmptyState title="Nenhum serviço cadastrado" icon={<Scissors className="h-6 w-6" />}>
              Cadastre o que você oferece, com duração, preço e foto.
            </EmptyState>
          ) : (
            <ul className="pn-svcs">
              {services.map((s, i) => (
                <li key={s.id} className={`pn-svc pn-card ${s.active ? "" : "off"}`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                  <div
                    className="ph"
                    style={{ backgroundImage: s.imageId ? `url(/i/${s.imageId})` : PLACEHOLDERS[i % PLACEHOLDERS.length] }}
                  >
                    {!s.imageId && s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="dur">{formatDuration(s.durationMinutes)}</span>
                  <Link href={`/painel/servicos?editar=${s.id}`} className="edit" aria-label={`Editar ${s.name}`}>
                    <Pencil />
                  </Link>
                  <div className="bd">
                    <b>
                      {s.name}
                      {!s.active && " (inativo)"}
                    </b>
                    <div className="pr">
                      <span>{formatMoney(s.priceCents)}</span>
                      <form action={toggleService}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          className={`pn-sw ${s.active ? "" : "off"}`}
                          role="switch"
                          aria-checked={s.active}
                          aria-label={s.active ? `Desativar ${s.name}` : `Ativar ${s.name}`}
                          title={s.active ? "Desativar" : "Ativar"}
                        />
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
