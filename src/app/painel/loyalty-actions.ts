"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { parseMoney } from "@/lib/appointments-list";
import { isRewardType } from "@/lib/loyalty";
import { addManualStamp, cancelReward, redeemReward, removeLastStamp, resetStamps } from "@/lib/loyalty-sync";

function refresh(clientId?: string) {
  revalidatePath("/painel");
  revalidatePath("/painel/agendamentos");
  revalidatePath("/painel/clientes");
  if (clientId) revalidatePath(`/painel/clientes/${clientId}`);
}

/** Usar o prêmio do cartão fidelidade neste atendimento. */
export async function applyReward(appointmentId: string) {
  const user = await requireActiveUser();
  const r = await redeemReward(user.businessId, appointmentId);
  refresh();
  return r;
}

async function clientOf(businessId: string, clientId: string) {
  return db.client.findFirst({ where: { id: clientId, businessId } });
}

/** Ações da ficha do cliente: dar selo, tirar o último, zerar ou remover um prêmio. */
export async function loyaltyAdjust(formData: FormData) {
  const user = await requireActiveUser();
  const clientId = String(formData.get("clientId") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!(await clientOf(user.businessId, clientId))) return;
  const b = user.business;
  if (op === "add") await addManualStamp(b, clientId);
  else if (op === "remove") await removeLastStamp(b, clientId);
  else if (op === "reset") await resetStamps(b, clientId);
  else if (op === "reward-off") await cancelReward(user.businessId, String(formData.get("rewardId") ?? ""));
  refresh(clientId);
}

export type LoyaltyState = { error?: string; success?: string } | undefined;

/** Configuração do cartão fidelidade. */
export async function saveLoyalty(_: LoyaltyState, formData: FormData): Promise<LoyaltyState> {
  const user = await requireActiveUser();
  const enabled = formData.get("enabled") === "on";
  const goal = Number(formData.get("goal"));
  if (!Number.isInteger(goal) || goal < 2 || goal > 30) return { error: "Escolha de 2 a 30 selos." };
  const type = String(formData.get("rewardType"));
  if (!isRewardType(type)) return { error: "Escolha o prêmio." };
  let value = 0;
  let serviceId: string | null = null;
  if (type === "FREE_SERVICE") {
    serviceId = String(formData.get("rewardServiceId") ?? "");
    if (!(await db.service.findFirst({ where: { id: serviceId, businessId: user.businessId } }))) return { error: "Escolha o serviço grátis." };
  } else if (type === "PERCENT") {
    const n = Number(String(formData.get("rewardValue") ?? "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > 100) return { error: "Desconto de 1 a 100%." };
    value = Math.round(n * 100);
  } else {
    const c = parseMoney(formData.get("rewardValue"));
    if (!c) return { error: "Informe o valor do desconto." };
    value = c;
  }
  const services = formData.getAll("services").map(String);
  const valid = await db.service.findMany({ where: { businessId: user.businessId, id: { in: services } }, select: { id: true } });
  const all = formData.get("allServices") === "on";
  if (!all && valid.length === 0) return { error: "Escolha pelo menos um serviço que conta selo." };
  const months = Number(formData.get("stampMonths"));
  const days = Number(formData.get("rewardDays"));
  const b = user.business;
  await db.business.update({
    where: { id: user.businessId },
    data: {
      loyaltyEnabled: enabled,
      loyaltyGoal: goal,
      loyaltyRewardType: type,
      loyaltyRewardValue: value,
      loyaltyRewardServiceId: serviceId,
      loyaltyServiceIds: all ? [] : valid.map((s) => s.id),
      loyaltyStampMonths: months > 0 ? months : null,
      loyaltyRewardDays: days > 0 ? days : null,
      loyaltyNotify: formData.get("notify") === "on",
      // os selos contam a partir de quando o cartão foi ligado pela primeira vez
      ...(enabled && !b.loyaltyStartedAt ? { loyaltyStartedAt: new Date() } : {}),
    },
  });
  revalidatePath("/painel/fidelidade");
  return { success: enabled ? "Cartão fidelidade salvo e ligado." : "Configuração salva (cartão desligado)." };
}
