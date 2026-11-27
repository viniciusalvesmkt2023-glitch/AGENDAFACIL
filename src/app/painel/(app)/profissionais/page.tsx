import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { FormPanel } from "@/components/form-panel";
import { Clock, Pencil, Power, UserRound } from "lucide-react";

import { toggleProfessional } from "@/app/painel/actions";
import { ProfessionalForm } from "./professional-form";
import { summarizeWeek } from "@/lib/pro-hours";
import "./pro-hours.css";

type Props = { searchParams: Promise<{ editar?: string }> };

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

  return (
    <>
      <PageHeader title="Gestão de equipe" description="Seus profissionais, os horários e os serviços de cada um." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 lg:order-2 lg:sticky lg:top-8">
          <FormPanel key={editing?.id ?? "novo"} title={editing ? `Editar: ${editing.name}` : "Novo profissional"} open={!!editing || professionals.length === 0}>
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
