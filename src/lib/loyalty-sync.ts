import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { appUrl } from "./brand";
import { TIMEZONE, nowInTimezone } from "./time";
import { earnsStamp, losesStamp, priceAfterReward, rewardLabel, stampCutoff } from "./loyalty";
import { sendClientText } from "./notifications";

type Biz = {
  id: string;
  name: string;
  slug: string;
  loyaltyEnabled: boolean;
  loyaltyGoal: number;
  loyaltyRewardType: string;
  loyaltyRewardServiceId: string | null;
  loyaltyRewardValue: number;
  loyaltyServiceIds: string[];
  loyaltyStampMonths: number | null;
  loyaltyRewardDays: number | null;
  loyaltyNotify: boolean;
  loyaltyStartedAt: Date | null;
};

const localDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);

/** Selos que ainda contam (não viraram prêmio e não venceram). */
export async function activeStamps(b: Pick<Biz, "id" | "loyaltyStampMonths">, clientId: string) {
  const cutoff = stampCutoff(nowInTimezone().date, b.loyaltyStampMonths);
  return db.loyaltyStamp.findMany({
    where: { businessId: b.id, clientId, rewardId: null, source: { in: ["APPOINTMENT", "MANUAL"] }, ...(cutoff ? { date: { gte: cutoff } } : {}) },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function availableRewards(businessId: string, clientId: string) {
  return db.loyaltyReward.findMany({
    where: { businessId, clientId, usedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "asc" },
  });
}

/** Cartão do cliente (para a página do agendamento, a ficha e o painel). */
export async function loyaltyCard(b: Biz, clientId: string) {
  if (!b.loyaltyEnabled) return null;
  const [stamps, rewards, rewardService] = await Promise.all([
    activeStamps(b, clientId),
    availableRewards(b.id, clientId),
    b.loyaltyRewardServiceId ? db.service.findUnique({ where: { id: b.loyaltyRewardServiceId }, select: { name: true } }) : null,
  ]);
  return {
    goal: b.loyaltyGoal,
    count: Math.min(stamps.length, b.loyaltyGoal),
    next: rewardLabel(b.loyaltyRewardType, b.loyaltyRewardValue, rewardService?.name),
    rewards: rewards.map((r) => ({ id: r.id, label: r.label, expiresAt: r.expiresAt })),
    stampMonths: b.loyaltyStampMonths,
  };
}

/** Se juntou selos suficientes, libera o prêmio (e esses selos saem do cartão). */
async function maybeIssueReward(b: Biz, clientId: string) {
  const stamps = await activeStamps(b, clientId);
  if (stamps.length < b.loyaltyGoal) return { count: stamps.length, reward: null as null | { label: string; expiresAt: Date | null } };
  const svc = b.loyaltyRewardServiceId ? await db.service.findUnique({ where: { id: b.loyaltyRewardServiceId } }) : null;
  const label = rewardLabel(b.loyaltyRewardType, b.loyaltyRewardValue, svc?.name);
  const expiresAt = b.loyaltyRewardDays ? new Date(Date.now() + b.loyaltyRewardDays * 86_400_000) : null;
  const reward = await db.loyaltyReward.create({
    data: {
      businessId: b.id,
      clientId,
      rewardType: b.loyaltyRewardType,
      // serviço grátis guarda o preço do serviço (vale como desconto até esse valor em outro serviço)
      rewardValue: b.loyaltyRewardType === "FREE_SERVICE" ? (svc?.priceCents ?? 0) : b.loyaltyRewardValue,
      rewardServiceId: b.loyaltyRewardType === "FREE_SERVICE" ? (svc?.id ?? null) : null,
      label,
      expiresAt,
    },
  });
  await db.loyaltyStamp.updateMany({ where: { id: { in: stamps.slice(0, b.loyaltyGoal).map((s) => s.id) } }, data: { rewardId: reward.id } });
  return { count: b.loyaltyGoal, reward: { label, expiresAt } };
}

/** Tira um selo. Se ele já tinha virado prêmio ainda não usado, o prêmio volta a ser selos. */
async function removeStamp(stamp: { id: string; rewardId: string | null }) {
  if (stamp.rewardId) {
    const r = await db.loyaltyReward.findUnique({ where: { id: stamp.rewardId } });
    if (r && !r.usedAt) await db.loyaltyReward.delete({ where: { id: r.id } }); // os outros selos voltam a contar
  }
  await db.loyaltyStamp.delete({ where: { id: stamp.id } }).catch(() => {});
}

function notify(b: Biz, client: { name: string; phone: string }, appointmentId: string | null, res: { count: number; reward: null | { label: string; expiresAt: Date | null } }, next: string) {
  if (!b.loyaltyNotify) return;
  const first = client.name.split(" ")[0];
  const text = res.reward
    ? `🎉 ${first}, seu cartão fidelidade em *${b.name}* completou!\nVocê ganhou: *${res.reward.label}*. É só agendar e usar${res.reward.expiresAt ? ` (vale até ${new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" }).format(res.reward.expiresAt)})` : ""}.\n${appUrl()}/${b.slug}`
    : `Obrigado pela visita, ${first}! ✂️\n🎟 Você ganhou mais um selo no cartão fidelidade de *${b.name}*: *${res.count} de ${b.loyaltyGoal}*.\nFaltam *${b.loyaltyGoal - res.count}* para ${next}!`;
  after(() => sendClientText({ businessId: b.id, appointmentId, phone: client.phone, type: res.reward ? "LOYALTY_REWARD" : "LOYALTY_STAMP", text }));
}

/**
 * Deixa o selo do atendimento certo depois de qualquer mudança (concluído, pago, cancelado, falta, reaberto).
 * Cancelado pelo cliente ou pelo profissional e falta não contam; 1 selo por dia por cliente.
 */
export async function syncLoyaltyStamp(appointmentId: string) {
  const a = await db.appointment.findUnique({ where: { id: appointmentId }, include: { business: true, loyaltyStamp: true, client: true, service: true } });
  if (!a) return;
  // cancelado ou falta: o prêmio usado neste atendimento volta para o cliente
  if ((a.status === "CANCELED" || a.status === "NO_SHOW") && a.loyaltyRewardId) {
    await db.$transaction([
      db.loyaltyReward.update({ where: { id: a.loyaltyRewardId }, data: { usedAt: null } }),
      db.appointment.update({ where: { id: a.id }, data: { loyaltyRewardId: null, priceCents: a.service.priceCents } }),
    ]);
  }
  const b = a.business;
  const today = nowInTimezone().date;
  if (a.loyaltyStamp) {
    // "REMOVED" = o dono tirou o selo deste atendimento: não volta sozinho
    if (losesStamp(a, today)) await removeStamp(a.loyaltyStamp);
    return;
  }
  const cfg = { loyaltyEnabled: b.loyaltyEnabled, loyaltyServiceIds: b.loyaltyServiceIds, startDate: b.loyaltyStartedAt ? localDate(b.loyaltyStartedAt) : null };
  if (!earnsStamp(a, cfg, today)) return;
  const sameDay = await db.loyaltyStamp.findFirst({ where: { businessId: b.id, clientId: a.clientId, date: a.date, source: "APPOINTMENT" } });
  if (sameDay) return;
  try {
    await db.loyaltyStamp.create({ data: { businessId: b.id, clientId: a.clientId, appointmentId: a.id, date: a.date } });
  } catch {
    return; // outro pedido já criou o selo deste atendimento
  }
  const res = await maybeIssueReward(b, a.clientId);
  const card = await loyaltyCard(b, a.clientId);
  notify(b, a.client, a.id, res, card?.next ?? "o prêmio");
}

// ---------- Ações do dono (ficha do cliente) ----------

export async function addManualStamp(b: Biz, clientId: string) {
  await db.loyaltyStamp.create({ data: { businessId: b.id, clientId, date: nowInTimezone().date, source: "MANUAL" } });
  return maybeIssueReward(b, clientId);
}

/** Tira o selo mais recente que ainda conta. */
export async function removeLastStamp(b: Biz, clientId: string) {
  const s = await activeStamps(b, clientId);
  const last = s[s.length - 1];
  if (!last) return false;
  // o atendimento continua concluído, mas sem selo: marca como "selo tirado" desligando o vínculo
  await db.loyaltyStamp.delete({ where: { id: last.id } });
  if (last.appointmentId) await db.loyaltyStamp.create({ data: { businessId: b.id, clientId, appointmentId: last.appointmentId, date: last.date, source: "REMOVED", rewardId: null } }).catch(() => {});
  return true;
}

/** Zera os selos que ainda contam (prêmios liberados continuam). */
export async function resetStamps(b: Biz, clientId: string) {
  const s = await activeStamps(b, clientId);
  for (const st of s) {
    await db.loyaltyStamp.delete({ where: { id: st.id } });
    if (st.appointmentId) await db.loyaltyStamp.create({ data: { businessId: b.id, clientId, appointmentId: st.appointmentId, date: st.date, source: "REMOVED" } }).catch(() => {});
  }
  return s.length;
}

export async function cancelReward(businessId: string, rewardId: string) {
  await db.loyaltyReward.updateMany({ where: { id: rewardId, businessId, usedAt: null }, data: { usedAt: new Date(), label: "Removido pelo estabelecimento" } });
}

/** Usa o prêmio neste atendimento: aplica o desconto (grátis já fica pago) e o atendimento não gera selo. */
export async function redeemReward(businessId: string, appointmentId: string) {
  const a = await db.appointment.findFirst({ where: { id: appointmentId, businessId }, include: { loyaltyStamp: true } });
  if (!a) return { ok: false as const, error: "Agendamento não encontrado." };
  if (a.loyaltyRewardId) return { ok: false as const, error: "Este atendimento já usou um prêmio." };
  if (a.status === "CANCELED" || a.status === "NO_SHOW") return { ok: false as const, error: "Atendimento cancelado." };
  const [reward] = await availableRewards(businessId, a.clientId);
  if (!reward) return { ok: false as const, error: "O cliente não tem prêmio disponível." };
  const price = priceAfterReward(a.priceCents, reward, a.serviceId);
  const claimed = await db.loyaltyReward.updateMany({ where: { id: reward.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!claimed.count) return { ok: false as const, error: "Prêmio já usado." };
  await db.appointment.update({
    where: { id: a.id },
    data: {
      priceCents: price,
      loyaltyRewardId: reward.id,
      ...(price === 0 ? { paymentStatus: "PAID", paymentMethod: null, paidAt: new Date() } : {}),
    },
  });
  if (a.loyaltyStamp && a.loyaltyStamp.source === "APPOINTMENT") await removeStamp(a.loyaltyStamp);
  return { ok: true as const, price, label: reward.label };
}
