import { Check, CheckCircle2, ChevronRight, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { evolutionConfigured } from "@/lib/evolution";
import { BUSINESS_TYPE_LIST, businessTypeInfo } from "@/lib/business-types";
import { suggestSlugs } from "@/lib/slug-check";
import { BusinessTypeIcon } from "@/components/business-type-icon";
import { formatPhone } from "@/lib/format";
import { minutesToTime } from "@/lib/time";
import { ConnectPanel } from "@/app/painel/(app)/whatsapp/connect-panel";
import { finishOnboarding, saveTypeStep } from "./actions";
import { LAST_STEP } from "./config";
import { StepFooter, StepProgress, StepTitle } from "./step-ui";
import { BusinessStep } from "./steps/business-step";
import { ServicesStep } from "./steps/services-step";
import { HoursStep } from "./steps/hours-step";
import { RulesStep } from "./steps/rules-step";
import { SubmitButton } from "@/components/submit-button";

type Props = { searchParams: Promise<{ passo?: string }> };

// Conexão com o WhatsApp por código pode levar alguns segundos (recria a conexão)
export const maxDuration = 60;

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const b = user.business;
  const step = Math.min(LAST_STEP, Math.max(1, Number((await searchParams).passo) || b.onboardingStep + 1));
  const type = businessTypeInfo(b.businessType);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <StepProgress step={step} />
      {step === 1 && (
        <>
          <StepTitle title={`Olá, ${firstName}! Qual é o seu tipo de negócio?`}>
            Assim já deixamos os serviços e as sugestões do jeito do seu estabelecimento.
          </StepTitle>
          <form action={saveTypeStep} className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPE_LIST.map((t) => {
              const selected = b.onboardingStep >= 1 && b.businessType === t.id;
              return (
                <button
                  key={t.id}
                  name="businessType"
                  value={t.id}
                  className={`card flex items-center gap-3 p-4 text-left transition active:scale-[0.99] ${
                    selected ? "border-brand-500 ring-2 ring-brand-100" : "hover:border-brand-300"
                  }`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? "bg-brand-500 text-white" : "bg-navy-50 text-navy-700"}`}>
                    <BusinessTypeIcon type={t.id} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-bold text-navy-900">{t.label}</span>
                    <span className="block text-sm text-zinc-500">{t.description}</span>
                  </span>
                  {selected ? <Check className="h-5 w-5 shrink-0 text-brand-600" /> : <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />}
                </button>
              );
            })}
          </form>
        </>
      )}
      {step === 2 && (
        <>
          <StepTitle title="Seu negócio">Como seus clientes vão encontrar você.</StepTitle>
          <BusinessStep
            name={b.name}
            // O link só aparece preenchido depois que o dono escolheu (o do cadastro é provisório)
            slug={b.onboardingStep >= 2 ? b.slug : ""}
            slugSuggestions={await suggestSlugs(b.name, b.businessType, b.id)}
            phone={b.phone ?? ""}
            address={b.address ?? ""}
            homeService={b.homeService}
          />
        </>
      )}
      {step === 3 && <ServicesData businessId={b.id} typeLabel={type.label} suggestions={type.services} />}
      {step === 4 && <HoursData businessId={b.id} />}
      {step === 5 && <RulesData business={b} />}
      {step === 6 && (
        <>
          <StepTitle title="Conecte seu WhatsApp">
            Seus clientes recebem a confirmação e o lembrete do <strong>seu número</strong>. Isso diminui muito as faltas.
          </StepTitle>
          <div className="card p-4 md:p-5">
            {!evolutionConfigured() ? (
              <p className="text-sm text-amber-700">O envio de WhatsApp está sendo configurado na plataforma. Você poderá conectar depois no menu WhatsApp.</p>
            ) : b.whatsappStatus === "CONNECTED" ? (
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> WhatsApp conectado{b.whatsappNumber ? `: ${formatPhone(b.whatsappNumber)}` : ""}
              </p>
            ) : (
              <ConnectPanel connecting={b.whatsappStatus === "CONNECTING"} defaultPhone={b.phone ?? ""} />
            )}
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm text-zinc-500">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" /> Você pode mudar os textos e quando os lembretes são enviados no menu WhatsApp.
          </p>
          <form action={finishOnboarding}>
            <StepFooter back="/comecar?passo=5">
              <SubmitButton className={`${b.whatsappStatus === "CONNECTED" ? "btn-primary" : "btn-secondary"} w-full md:w-auto md:px-8`} pendingText="Finalizando...">
                {b.whatsappStatus === "CONNECTED" ? "Concluir" : "Pular e concluir"}
              </SubmitButton>
            </StepFooter>
          </form>
        </>
      )}
    </>
  );
}

async function ServicesData({ businessId, typeLabel, suggestions }: { businessId: string; typeLabel: string; suggestions: ReturnType<typeof businessTypeInfo>["services"] }) {
  const existing = await db.service.findMany({
    where: { businessId },
    select: { id: true, name: true, durationMinutes: true, priceCents: true },
    orderBy: { createdAt: "asc" },
  });
  const names = new Set(existing.map((s) => s.name.toLowerCase()));
  return (
    <>
      <StepTitle title="Quais serviços você oferece?">
        Separamos os mais comuns de <strong>{typeLabel.toLowerCase()}</strong>. Marque os seus e ajuste preço e duração.
      </StepTitle>
      <ServicesStep existing={existing} suggestions={suggestions.filter((s) => !names.has(s.name.toLowerCase()))} />
    </>
  );
}

async function HoursData({ businessId }: { businessId: string }) {
  const hours = await db.workingHour.findMany({ where: { businessId }, orderBy: { weekday: "asc" } });
  const open = hours.filter((h) => h.isOpen);
  // Dia de referência: o primeiro dia aberto de segunda a sexta (ou qualquer um)
  const ref = open.find((h) => h.weekday >= 1 && h.weekday <= 5) ?? open[0] ?? hours[0];
  const sat = hours.find((h) => h.weekday === 6);
  const t = (m: number | null | undefined, fallback: string) => (m === null || m === undefined ? fallback : minutesToTime(m));
  const satDiff = !!(sat?.isOpen && ref && (sat.startMinutes !== ref.startMinutes || sat.endMinutes !== ref.endMinutes));
  return (
    <>
      <StepTitle title="Quando você atende?">Escolha os dias e o horário. O cliente só consegue marcar dentro dele.</StepTitle>
      <HoursStep
        initial={{
          days: open.map((h) => h.weekday),
          start: t(ref?.startMinutes, "09:00"),
          end: t(ref?.endMinutes, "19:00"),
          lunch: ref?.breakStart !== null && ref?.breakStart !== undefined,
          lunchStart: t(ref?.breakStart, "12:00"),
          lunchEnd: t(ref?.breakEnd, "13:00"),
          satDiff,
          satStart: t(sat?.startMinutes, "09:00"),
          satEnd: t(satDiff ? sat?.endMinutes : 14 * 60, "14:00"),
        }}
      />
    </>
  );
}

async function RulesData({ business }: { business: { id: string; slotInterval: number; minAdvanceMinutes: number; maxAdvanceDays: number } }) {
  const hours = await db.workingHour.findMany({ where: { businessId: business.id, isOpen: true }, orderBy: { weekday: "asc" } });
  const ref = hours.find((h) => h.weekday >= 1 && h.weekday <= 5) ?? hours[0];
  return (
    <>
      <StepTitle title="Regras do agendamento">Como os clientes vão poder marcar pelo seu link. Já deixamos o mais comum escolhido.</StepTitle>
      <RulesStep
        slotInterval={business.slotInterval}
        minAdvanceMinutes={business.minAdvanceMinutes}
        maxAdvanceDays={business.maxAdvanceDays}
        dayStart={ref?.startMinutes ?? 540}
        dayEnd={ref?.endMinutes ?? 1080}
        breakStart={ref?.breakStart ?? null}
        breakEnd={ref?.breakEnd ?? null}
      />
    </>
  );
}
