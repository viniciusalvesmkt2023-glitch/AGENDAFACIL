import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { FormModal, SavedToast } from "@/components/form-modal";
import { Clock, Pencil, Plus, Power, UserRound } from "lucide-react";

import { toggleProfessional } from "@/app/painel/actions";
import { ProfessionalForm } from "./professional-form";
import { summarizeWeek } from "@/lib/pro-hours";
import "./pro-hours.css";

type Props = { searchParams: Promise<{ editar?: string; novo?: string }> };

export default async function ProfessionalsPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const [professionals, services] = await Promise.all([
    db.professional.findMany({
      where: { businessId: user.businessId },
      include: { services: { include: { service: true } }, hours: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    db.service.findMany({ where: { businessId: user.businessId, active: true }, orderBy: { name: "asc" } }),
  ]);
  const businessHours = await db.workingHour.findMany({ where: { businessId: user.businessId } });
  const pick = <T extends { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number; breakStart: number | null; breakEnd: number | null }>(h: T) => ({
    weekday: h.weekday,
    isOpen: h.isOpen,
    startMinutes: h.startMinutes,
    endMinutes: h.endMinutes,
    breakStart: h.breakStart,
    breakEnd: h.breakEnd,
  });
  const editing = params.editar ? professionals.find((p) => p.id === params.editar) : undefined;

  const showForm = !!editing || !!params.novo;

  return (
    <>
      <SavedToast />
      <PageHeader
        title="Gestão de equipe"
        description="Seus profissionais, os horários e os serviços de cada um."
        action={
          <Link href="/painel/profissionais?novo=1" scroll={false} className="pn-btn pn-g-brand" data-testid="new-professional">
            <Plus /> <span className="hidden sm:inline">Novo profissional</span><span className="sm:hidden">Novo</span>
          </Link>
        }
      />
      {showForm && (
        <FormModal
          wide
          icon={<UserRound />}
          title={editing ? `Editar: ${editing.name}` : "Novo profissional"}
          subtitle="Dados, serviços, horário e comissão em um só lugar."
          closeHref="/painel/profissionais"
        >
          <ProfessionalForm
            key={editing?.id ?? "new"}
            services={services}
            businessHours={businessHours.map(pick)}
            professional={
              editing && {
                id: editing.id,
                name: editing.name,
                phone: editing.phone,
                serviceIds: editing.services.map((s) => s.serviceId),
                imageId: editing.imageId,
                customHours: editing.customHours,
                commissionType: editing.commissionType,
                commissionRate: editing.commissionRate,
                productCommissionBps: editing.productCommissionBps,
                hours: editing.hours.map(pick),
              }
            }
          />
        </FormModal>
      )}
      <div>
          {professionals.length === 0 ? (
            <EmptyState title="Nenhum profissional cadastrado" icon={<UserRound className="h-6 w-6" />}>
              <Link href="/painel/profissionais?novo=1" scroll={false} className="pn-btn pn-g-brand mt-4"><Plus /> Adicionar profissional</Link>
            </EmptyState>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {professionals.map((p) => (
                <li key={p.id} className={`card flex items-center gap-3 rounded-3xl px-4 py-3.5 ${p.active ? "" : "opacity-50"}`}>
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
                    {(() => {
                      const rows = p.customHours ? p.hours : businessHours;
                      const on = new Set(rows.filter((h) => h.isOpen).map((h) => h.weekday));
                      return (
                        <>
                          <span className={`pr-sum ${p.customHours ? "" : "same"}`} data-testid="pro-hours-summary">
                            <Clock />
                            <span>{p.customHours ? summarizeWeek(rows) : "Horário do estabelecimento"}</span>
                          </span>
                          {p.customHours && (
                            <span className="pr-mini" aria-hidden="true">
                              {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                                <i key={wd} className={on.has(wd) ? "on" : ""} />
                              ))}
                            </span>
                          )}
                          {p.phone && <p className="truncate text-xs text-zinc-400">{formatPhone(p.phone)}</p>}
                        </>
                      );
                    })()}
                  </div>
                  <Link href={`/painel/profissionais?editar=${p.id}`} scroll={false} className="btn-icon" aria-label={`Editar ${p.name}`}>
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
              <li>
                <Link href="/painel/profissionais?novo=1" scroll={false} className="fm-add h-full">
                  <Plus /> Adicionar profissional
                </Link>
              </li>
            </ul>
          )}
      </div>
    </>
  );
}
