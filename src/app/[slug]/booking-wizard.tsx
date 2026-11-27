"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, Check, ChevronLeft } from "lucide-react";
import { bookOnline } from "./actions";
import { TimePicker, type TimeValue } from "@/components/public/time-picker";
import { formatDateLong, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatDuration, formatMoney } from "@/lib/format";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number; imageUrl?: string | null };
type Professional = { id: string; name: string; imageUrl?: string | null; serviceIds: string[]; openWeekdays: number[]; closedDates: string[] };

type Props = {
  slug: string;
  today: string;
  maxAdvanceDays: number;
  services: Service[];
  professionals: Professional[];
};

const ANY = "__any__";
const TITLES = ["Escolha o serviço", "Com quem você quer ser atendido?", "Escolha o dia e o horário", "Seus dados"];
const SHORT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T12:00:00Z`);
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Agendamento em etapas: serviço → profissional → dia e horário → dados. Uma etapa por vez. */
export function BookingWizard({ slug, today, maxAdvanceDays, services, professionals }: Props) {
  const [state, action] = useActionState(bookOnline, undefined);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [serviceId, setServiceId] = useState<string>();
  const [professionalId, setProfessionalId] = useState<string>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<number>();
  const cardRef = useRef<HTMLElement>(null);

  const service = services.find((s) => s.id === serviceId);
  const pros = useMemo(() => professionals.filter((p) => serviceId && p.serviceIds.includes(serviceId)), [professionals, serviceId]);
  const pro = pros.find((p) => p.id === professionalId);
  const onlyOnePro = pros.length === 1;

  const [timeLabel, setTimeLabel] = useState<string>();
  const pickTime = useCallback((v: TimeValue) => {
    setDate(v.date);
    setTime(v.time);
    setTimeLabel(v.label);
  }, []);
  // Dias fechados: os do profissional escolhido (ou, sem preferência, quando nenhum atende)
  const dayPros = useMemo(() => (pro ? [pro] : pros), [pro, pros]);

  function go(next: number) {
    setDir(next >= step ? 1 : -1);
    setStep(next);
    // Mantém o cartão à vista ao trocar de etapa (no celular a página é longa)
    requestAnimationFrame(() => {
      const top = cardRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > window.innerHeight * 0.6) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  // Tocar só seleciona; quem avança é o botão "Continuar" da barra de baixo
  function pickService(id: string) {
    if (id !== serviceId) {
      setServiceId(id);
      setTime(undefined);
      setTimeLabel(undefined);
      const available = professionals.filter((p) => p.serviceIds.includes(id));
      // Só um profissional faz o serviço: já fica escolhido (a etapa é pulada)
      setProfessionalId(available.length === 1 ? available[0].id : undefined);
    }
  }
  function next() {
    if (step === 0) go(onlyOnePro ? 2 : 1);
    else go(step + 1);
  }

  const slotLabel = timeLabel;
  const proLabel = professionalId === ANY ? "Primeiro disponível" : pro?.name;
  const chips = [
    step > 0 && service && { label: service.name, to: 0 },
    step > 1 && proLabel && { label: professionalId === ANY ? "Qualquer profissional" : proLabel, to: onlyOnePro ? 0 : 1 },
    step > 2 && date && slotLabel && { label: `${WEEKDAYS_SHORT[weekdayOf(date)]} ${Number(date.slice(8))} · ${slotLabel}`, to: 2 },
  ].filter(Boolean) as { label: string; to: number }[];
  const backTo = step === 2 && onlyOnePro ? 0 : step - 1;

  // Barra de baixo: o que foi escolhido na etapa atual + Continuar
  const bar =
    step === 0 && service
      ? {
          thumb: service.imageUrl ? { img: service.imageUrl } : { text: service.name.charAt(0).toUpperCase() },
          title: service.name,
          sub: `${formatMoney(service.priceCents)} · ${formatDuration(service.durationMinutes)}`,
        }
      : step === 1 && professionalId
        ? { thumb: pro?.imageUrl ? { img: pro.imageUrl, round: true } : { text: professionalId === ANY ? "✱" : (pro?.name.charAt(0).toUpperCase() ?? ""), round: true }, title: proLabel ?? "", sub: service?.name ?? "" }
        : step === 2 && date && time !== undefined && slotLabel
          ? { thumb: { icon: true }, title: `${capitalize(SHORT.format(asDate(date)).replace(/\./g, ""))} · ${slotLabel}`, sub: `${service?.name ?? ""}${proLabel ? ` · ${proLabel}` : ""}` }
          : null;

  return (
    <>
    <section ref={cardRef} className="hb-card hb-glass" style={{ scrollMarginTop: 12 }}>
      <div className="hb-progress" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <div className="hb-shead">
        {step > 0 && (
          <button type="button" className="hb-back" onClick={() => go(backTo)} aria-label="Voltar">
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        )}
        <div>
          <p className="hb-eyebrow">Etapa {step + 1} de 4</p>
          <h2 className="hb-title">{TITLES[step]}</h2>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="hb-chips">
          {chips.map((c) => (
            <button key={c.label} type="button" className="hb-chip" onClick={() => go(c.to)}>
              <Check strokeWidth={3} /> {c.label}
            </button>
          ))}
        </div>
      )}

      <div key={step} className={`hb-stage ${dir < 0 ? "hb-back-anim" : ""}`}>
        {step === 0 && (
          <div className="hb-grid2">
            {services.map((s) => {
              const sel = s.id === serviceId;
              return (
                <button key={s.id} type="button" className={`hb-svc ${sel ? "sel" : ""}`} onClick={() => pickService(s.id)} aria-pressed={sel}>
                  <span
                    className={`hb-svc-ph ${s.imageUrl ? "has-img" : ""}`}
                    style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined}
                  >
                    {!s.imageUrl && s.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hb-svc-dur">{formatDuration(s.durationMinutes)}</span>
                  <span className="hb-svc-ck">{sel && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />}</span>
                  <span className="hb-svc-bd">
                    <span className="hb-svc-n">{s.name}</span>
                    {s.description && <span className="hb-svc-desc">{s.description}</span>}
                    <span className="hb-svc-pr">{formatMoney(s.priceCents)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="hb-pros">
            {pros.length > 1 && (
              <ProCard
                name="Sem preferência"
                hint="Primeiro disponível"
                initial="✱"
                selected={professionalId === ANY}
                onClick={() => {
                  setProfessionalId(ANY);
                  setTime(undefined);
      setTimeLabel(undefined);
                }}
              />
            )}
            {pros.map((p) => (
              <ProCard
                key={p.id}
                name={p.name}
                initial={p.name.charAt(0).toUpperCase()}
                imageUrl={p.imageUrl}
                selected={professionalId === p.id}
                onClick={() => {
                  setProfessionalId(p.id);
                  setTime(undefined);
      setTimeLabel(undefined);
                }}
              />
            ))}
          </div>
        )}

        {step === 2 && service && (
          <TimePicker
            slug={slug}
            serviceId={service.id}
            professionalId={professionalId === ANY ? undefined : professionalId}
            pros={dayPros}
            today={today}
            maxAdvanceDays={maxAdvanceDays}
            value={{ date, time, label: timeLabel }}
            onChange={pickTime}
          />
        )}

        {step === 3 && service && date && time !== undefined && (
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="serviceId" value={service.id} />
            <input type="hidden" name="professionalId" value={professionalId === ANY ? "" : (professionalId ?? "")} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="time" value={time} />
            <label className="hb-field">
              <span>Seu nome</span>
              <input id="clientName" name="clientName" required autoComplete="name" placeholder="Como podemos te chamar?" defaultValue={state?.values?.clientName} />
            </label>
            <label className="hb-field">
              <span>WhatsApp</span>
              <input id="clientPhone" name="clientPhone" required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" defaultValue={state?.values?.clientPhone} />
            </label>
            <label className="hb-field">
              <span>Observação (opcional)</span>
              <input id="notes" name="notes" maxLength={500} placeholder="Alguma preferência?" defaultValue={state?.values?.notes} />
            </label>
            <div className="hb-summary">
              <div><span>Serviço</span><b>{service.name}</b></div>
              <div><span>Profissional</span><b>{proLabel}</b></div>
              <div><span>Quando</span><b className="first-letter:uppercase">{formatDateLong(date)} às {slotLabel}</b></div>
              <div><span>Valor</span><b>{formatMoney(service.priceCents)}</b></div>
            </div>
            {state?.error && <p className="hb-error">{state.error}</p>}
            <SubmitBooking />
            <p className="hb-legal">
              Você vai receber a confirmação e um lembrete no WhatsApp. Seus dados são usados só para o agendamento (veja a{" "}
              <a href="/privacidade" target="_blank">Política de Privacidade</a>).
            </p>
          </form>
        )}
      </div>
    </section>
    {bar && (
      <>
        <div className="hb-bar-space" />
        <div className="hb-bar hb-glass" role="region" aria-label="Sua escolha">
          <span
            className={`hb-bar-thumb ${"round" in bar.thumb && bar.thumb.round ? "round" : ""} ${"icon" in bar.thumb ? "time" : ""}`}
            style={"img" in bar.thumb ? { backgroundImage: `url(${bar.thumb.img})` } : undefined}
          >
            {"text" in bar.thumb && bar.thumb.text}
            {"icon" in bar.thumb && <CalendarDays />}
          </span>
          <span className="hb-bar-txt">
            <b>{bar.title}</b>
            <small>{bar.sub}</small>
          </span>
          <button type="button" className="hb-primary" onClick={next}>
            Continuar
          </button>
        </div>
      </>
    )}
    </>
  );
}

function SubmitBooking() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="hb-primary" disabled={pending}>
      {pending ? "Confirmando..." : "Confirmar agendamento"}
    </button>
  );
}

function ProCard({ name, hint, initial, imageUrl, selected, onClick }: { name: string; hint?: string; initial: string; imageUrl?: string | null; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`hb-pro ${selected ? "sel" : ""}`} onClick={onClick} aria-pressed={selected}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hb-av hb-av-img" src={imageUrl} alt="" />
      ) : (
        <span className="hb-av">{initial}</span>
      )}
      <span className="hb-pro-n">{name}</span>
      {hint && <span className="hb-pro-d">{hint}</span>}
    </button>
  );
}
