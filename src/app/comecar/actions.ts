"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/format";
import { checkSlug } from "@/lib/slug-check";
import { BUSINESS_TYPE_IDS } from "@/lib/business-types";
import { timeToMinutes } from "@/lib/time";
import { EMPTY_ADDRESS, parseAddress } from "@/lib/address";
import { LAST_STEP, MAX_DAYS_OPTIONS, MIN_ADVANCE_OPTIONS, SLOT_OPTIONS } from "./config";

export type StepState = { error?: string | null; values?: Record<string, string> } | undefined;

function keep(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$"))) as Record<string, string>;
}

/** Marca o passo como concluído (nunca volta para trás). */
const done = (current: number, step: number) => Math.max(current, step);

// ---------- Passo 1: tipo de negócio ----------

export async function saveTypeStep(formData: FormData) {
  const user = await requireActiveUser();
  const parsed = z.enum(BUSINESS_TYPE_IDS).safeParse(formData.get("businessType"));
  if (!parsed.success) redirect("/comecar?passo=1");
  await db.business.update({
    where: { id: user.businessId },
    data: { businessType: parsed.data, onboardingStep: done(user.business.onboardingStep, 1) },
  });
  redirect("/comecar?passo=2");
}

// ---------- Passo 2: dados do negócio ----------

export async function saveBusinessStep(_: StepState, formData: FormData): Promise<StepState> {
  const user = await requireActiveUser();
  const schema = z.object({
    name: z.string().trim().min(2, "Informe o nome do estabelecimento.").max(80),
    slug: z.string().trim().min(1, "Escolha o link da sua agenda."),
    phone: z.string().trim().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep(formData) };
  const d = parsed.data;
  const addr = parseAddress(Object.fromEntries(formData));
  if (addr.kind === "empty") return { error: "Digite o CEP do endereço ou marque que atende sem endereço fixo.", values: keep(formData) };
  if (addr.kind === "error") return { error: addr.error, values: keep(formData) };
  const homeService = addr.kind === "home";
  const phoneDigits = (d.phone ?? "").replace(/\D/g, "");
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
    return { error: "WhatsApp inválido. Use DDD + número, ex.: (11) 99999-9999.", values: keep(formData) };
  }

  const check = await checkSlug(d.slug, { businessId: user.businessId, businessType: user.business.businessType });
  if (!check.available) return { error: check.message, values: keep(formData) };

  await db.business.update({
    where: { id: user.businessId },
    data: {
      name: d.name,
      slug: check.slug,
      phone: d.phone || null,
      homeService,
      ...(addr.kind === "ok" ? { ...addr.parts, address: addr.address } : { ...EMPTY_ADDRESS, address: null }),
      onboardingStep: done(user.business.onboardingStep, 2),
    },
  });
  revalidatePath("/painel", "layout");
  redirect("/comecar?passo=3");
}

// ---------- Passo 3: serviços ----------

const serviceItem = z.object({
  name: z.string().trim().min(2, "Todo serviço precisa de um nome.").max(80),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  price: z.string(),
});

export async function saveServicesStep(_: StepState, formData: FormData): Promise<StepState> {
  const user = await requireActiveUser();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("services") ?? "[]"));
  } catch {
    return { error: "Não foi possível ler os serviços. Tente novamente." };
  }
  const parsed = z.array(serviceItem).max(40).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const items = [];
  for (const s of parsed.data) {
    const priceCents = parseMoneyToCents(s.price || "0");
    if (!Number.isFinite(priceCents) || priceCents < 0) return { error: `Preço inválido em “${s.name}”.` };
    items.push({ name: s.name, durationMinutes: s.durationMinutes, priceCents });
  }

  const existing = await db.service.findMany({ where: { businessId: user.businessId }, select: { name: true } });
  const names = new Set(existing.map((s) => s.name.toLowerCase()));
  const toCreate = items.filter((s) => !names.has(s.name.toLowerCase()));
  if (existing.length + toCreate.length === 0) return { error: "Escolha pelo menos um serviço para continuar." };

  if (toCreate.length) {
    const pros = await db.professional.findMany({ where: { businessId: user.businessId, active: true }, select: { id: true } });
    await db.$transaction(
      toCreate.map((s) =>
        db.service.create({
          data: {
            businessId: user.businessId,
            ...s,
            // Por padrão, todos os profissionais fazem o serviço
            professionals: { create: pros.map((p) => ({ professionalId: p.id })) },
          },
        }),
      ),
    );
  }
  await db.business.update({ where: { id: user.businessId }, data: { onboardingStep: done(user.business.onboardingStep, 3) } });
  revalidatePath("/painel/servicos");
  redirect("/comecar?passo=4");
}

// ---------- Passo 4: horários ----------

export async function saveHoursStep(_: StepState, formData: FormData): Promise<StepState> {
  const user = await requireActiveUser();
  const days = new Set(formData.getAll("days").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (days.size === 0) return { error: "Escolha pelo menos um dia de atendimento." };

  const t = (k: string) => timeToMinutes(String(formData.get(k) ?? ""));
  const start = t("start");
  const end = t("end");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { error: "O horário de fechamento precisa ser depois da abertura." };

  const lunch = formData.get("lunch") === "on";
  const lunchStart = t("lunchStart");
  const lunchEnd = t("lunchEnd");
  if (lunch && (!Number.isFinite(lunchStart) || !Number.isFinite(lunchEnd) || lunchEnd <= lunchStart || lunchStart < start || lunchEnd > end)) {
    return { error: "O almoço precisa estar dentro do horário de atendimento." };
  }

  const satDiff = formData.get("satDiff") === "on" && days.has(6);
  const satStart = t("satStart");
  const satEnd = t("satEnd");
  if (satDiff && (!Number.isFinite(satStart) || !Number.isFinite(satEnd) || satEnd <= satStart)) {
    return { error: "Confira o horário de sábado." };
  }

  await db.$transaction(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const isSat = weekday === 6 && satDiff;
      const s = isSat ? satStart : start;
      const e = isSat ? satEnd : end;
      // O almoço só vale no sábado diferente se couber no horário dele
      const hasLunch = lunch && lunchStart >= s && lunchEnd <= e;
      const data = {
        isOpen: days.has(weekday),
        startMinutes: s,
        endMinutes: e,
        breakStart: hasLunch ? lunchStart : null,
        breakEnd: hasLunch ? lunchEnd : null,
      };
      return db.workingHour.upsert({
        where: { businessId_weekday: { businessId: user.businessId, weekday } },
        update: data,
        create: { businessId: user.businessId, weekday, ...data },
      });
    }),
  );
  await db.business.update({ where: { id: user.businessId }, data: { onboardingStep: done(user.business.onboardingStep, 4) } });
  revalidatePath("/painel/horarios");
  redirect("/comecar?passo=5");
}

// ---------- Passo 5: regras ----------

export async function saveRulesStep(_: StepState, formData: FormData): Promise<StepState> {
  const user = await requireActiveUser();
  const slotInterval = Number(formData.get("slotInterval"));
  const minAdvanceMinutes = Number(formData.get("minAdvanceMinutes"));
  const maxAdvanceDays = Number(formData.get("maxAdvanceDays"));
  if (!SLOT_OPTIONS.includes(slotInterval)) return { error: "Escolha de quanto em quanto tempo os horários aparecem." };
  if (!MIN_ADVANCE_OPTIONS.some((o) => o.value === minAdvanceMinutes)) return { error: "Escolha a antecedência mínima." };
  if (!MAX_DAYS_OPTIONS.includes(maxAdvanceDays)) return { error: "Escolha até quantos dias o cliente pode agendar." };

  await db.business.update({
    where: { id: user.businessId },
    data: { slotInterval, minAdvanceMinutes, maxAdvanceDays, onboardingStep: done(user.business.onboardingStep, 5) },
  });
  redirect("/comecar?passo=6");
}

// ---------- Fim ----------

export async function finishOnboarding() {
  const user = await requireActiveUser();
  await db.business.update({
    where: { id: user.businessId },
    data: { onboardedAt: user.business.onboardedAt ?? new Date(), onboardingStep: LAST_STEP },
  });
  revalidatePath("/painel", "layout");
  redirect("/comecar/pronto");
}
