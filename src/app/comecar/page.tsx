import { CheckCircle2, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { evolutionConfigured } from "@/lib/evolution";
import { businessTypeInfo } from "@/lib/business-types";
import { formatPhone } from "@/lib/format";
import { minutesToTime } from "@/lib/time";
import { ConnectPanel } from "@/app/painel/(app)/whatsapp/connect-panel";
import { finishOnboarding } from "./actions";
import { StepFooter, StepProgress, StepTitle } from "./step-ui";
import { BusinessStep } from "./steps/business-step";
import { ServicesStep } from "./steps/services-step";
import { HoursStep } from "./steps/hours-step";
import { RulesStep } from "./steps/rules-step";
import { SubmitButton } from "@/components/submit-button";

type Props = { searchParams: Promise<{ passo?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await requireActiveUser();
  const b = user.business;
  const step = Math.min(5, Math.max(1, Number((await searchParams).passo) || 1));
  const type = businessTypeInfo(b.businessType);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <StepProgress step={step} />
      {step === 1 && (
        <>
          <StepTitle title={`Olá, ${firstName}! Vamos montar sua agenda`}>
            São 5 passos rápidos. No final, seu link já estará pronto para receber clientes.
          </StepTitle>
          <BusinessStep
            name={b.name}
            businessType={b.businessType}
            slug={b.slug}
            phone={b.phone ?? ""}
            address={b.address ?? ""}
            homeService={b.homeService}
          />
        </>
      )}
      {step === 2 && <ServicesData businessId={b.id} typeLabel={type.label} suggestions={type.services} />}
      {step === 3 && <HoursData businessId={b.id} />}
      {step === 4 && <RulesData business={b} />}
      {step === 5 && (
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
            <StepFooter back="/comecar?passo=4">
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
