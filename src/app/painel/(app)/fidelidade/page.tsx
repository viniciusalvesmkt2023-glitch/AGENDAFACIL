import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { LoyaltyForm } from "./form";
import "@/components/public/public.css";
import "./fidelidade.css";

export default async function LoyaltyPage() {
  const user = await requireActiveUser();
  const b = user.business;
  const [services, cards, issued, used] = await Promise.all([
    db.service.findMany({ where: { businessId: b.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, priceCents: true } }),
    db.loyaltyStamp.groupBy({ by: ["clientId"], where: { businessId: b.id, source: { in: ["APPOINTMENT", "MANUAL"] } } }),
    db.loyaltyReward.count({ where: { businessId: b.id, usedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
    db.loyaltyReward.count({ where: { businessId: b.id, usedAt: { not: null }, usedOn: { isNot: null } } }),
  ]);
  return (
    <>
      <PageHeader title="Cartão fidelidade" description="Selos automáticos a cada atendimento concluído e um prêmio quando o cartão completa." />
      {services.length === 0 ? (
        <p className="card p-5 text-sm text-zinc-500">
          Cadastre seus serviços primeiro em <Link href="/painel/servicos" className="font-semibold text-brand-700">Serviços</Link>.
        </p>
      ) : (
        <>
          <div className="fd-kpis">
            <div className="card fd-kpi">
              <small>Clientes com selos</small>
              <b>{cards.length}</b>
            </div>
            <div className="card fd-kpi">
              <small>Prêmios disponíveis</small>
              <b>{issued}</b>
            </div>
            <div className="card fd-kpi">
              <small>Prêmios usados</small>
              <b>{used}</b>
            </div>
          </div>
          <LoyaltyForm
            business={b.name}
            services={services}
            cfg={{
              enabled: b.loyaltyEnabled,
              goal: b.loyaltyGoal,
              rewardType: b.loyaltyRewardType,
              rewardValue: b.loyaltyRewardValue,
              rewardServiceId: b.loyaltyRewardServiceId,
              serviceIds: b.loyaltyServiceIds,
              stampMonths: b.loyaltyStampMonths,
              rewardDays: b.loyaltyRewardDays,
              notify: b.loyaltyNotify,
            }}
          />
        </>
      )}
    </>
  );
}
