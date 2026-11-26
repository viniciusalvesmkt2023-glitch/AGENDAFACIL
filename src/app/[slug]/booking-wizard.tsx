"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronLeft, Clock } from "lucide-react";
import { bookOnline } from "./actions";
import { useSlots } from "@/components/use-slots";
import { addDays, formatDateLong, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";
import { formatDuration, formatMoney } from "@/lib/format";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number; imageUrl?: string | null };
type Professional = { id: string; name: string; serviceIds: string[]; openWeekdays: number[]; closedDates: string[] };

type Props = {
  slug: string;
  today: string;
  maxAdvanceDays: number;
  services: Service[];
  professionals: Professional[];
};

const ANY = "__any__";
const TITLES = ["Escolha o serviço", "Com quem você quer ser atendido?", "Escolha o dia e o horário", "Seus dados"];
const PERIODS: [string, number, number][] = [
  ["Manhã", 0, 12 * 60],
  ["Tarde", 12 * 60, 18 * 60],
  ["Noite", 18 * 60, 24 * 60],
];

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

  const { slots, loading, message, closed } = useSlots({
    slug,
    serviceId: professionalId ? serviceId : undefined,
    professionalId: professionalId === ANY ? undefined : professionalId,
    date,
  });

  // Dia fechado: o profissional escolhido não atende (ou, sem preferência, nenhum atende)
  const isClosed = useMemo(() => {
    const list = pro ? [pro] : pros;
    return (d: string) => list.every((p) => !p.openWeekdays.includes(weekdayOf(d)) || p.closedDates.includes(d));
  }, [pro, pros]);
  const days = useMemo(() => Array.from({ length: maxAdvanceDays + 1 }, (_, i) => addDays(today, i)), [today, maxAdvanceDays]);

  // Ao chegar na etapa de horários, já escolhe o primeiro dia aberto
  useEffect(() => {
    if (step === 2 && (!date || isClosed(date))) setDate(days.find((d) => !isClosed(d)));
  }, [step, date, days, isClosed]);

  function go(next: number) {
    setDir(next >= step ? 1 : -1);
    setStep(next);
    // Mantém o cartão à vista ao trocar de etapa (no celular a página é longa)
    requestAnimationFrame(() => {
      const top = cardRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > window.innerHeight * 0.6) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const later = (fn: () => void) => setTimeout(fn, 220);

  function pickService(id: string) {
    setServiceId(id);
    setTime(undefined);
    const available = professionals.filter((p) => p.serviceIds.includes(id));
    if (available.length === 1) {
      // Só um profissional faz o serviço: escolhe sozinho e pula a etapa
      setProfessionalId(available[0].id);
      later(() => go(2));
    } else {
      setProfessionalId(undefined);
      later(() => go(1));
    }
  }

  const slotLabel = slots.find((s) => s.time === time)?.label;
  const proLabel = professionalId === ANY ? "Primeiro disponível" : pro?.name;
  const chips = [
    step > 0 && service && { label: service.name, to: 0 },
    step > 1 && proLabel && { label: professionalId === ANY ? "Qualquer profissional" : proLabel, to: onlyOnePro ? 0 : 1 },
    step > 2 && date && slotLabel && { label: `${WEEKDAYS_SHORT[weekdayOf(date)]} ${Number(date.slice(8))} · ${slotLabel}`, to: 2 },
  ].filter(Boolean) as { label: string; to: number }[];
  const backTo = step === 2 && onlyOnePro ? 0 : step - 1;

  return (
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
                  later(() => go(2));
                }}
              />
            )}
            {pros.map((p) => (
              <ProCard
                key={p.id}
                name={p.name}
                initial={p.name.charAt(0).toUpperCase()}
                selected={professionalId === p.id}
                onClick={() => {
                  setProfessionalId(p.id);
                  setTime(undefined);
                  later(() => go(2));
                }}
              />
            ))}
          </div>
        )}

        {step === 2 && (
          <>
            <div className="hb-days">
              {days.map((d) => {
                const off = isClosed(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={off}
                    className={`hb-day ${d === date ? "sel" : ""}`}
                    onClick={() => {
                      setDate(d);
                      setTime(undefined);
                    }}
                    aria-label={`${formatDateLong(d)}${off ? " (fechado)" : ""}`}
                  >
                    <small>{d === today ? "Hoje" : WEEKDAYS_SHORT[weekdayOf(d)]}</small>
                    <b>{Number(d.slice(8))}</b>
                    {off && <em>fechado</em>}
                  </button>
                );
              })}
            </div>
            {loading ? (
              <p className="hb-loading">Buscando horários...</p>
            ) : slots.length === 0 ? (
              date && <p className="hb-empty">{message ?? "Nenhum horário livre nesta data. Escolha outro dia."}</p>
            ) : (
              PERIODS.map(([label, from, to]) => {
                const list = slots.filter((s) => s.time >= from && s.time < to);
                if (!list.length) return null;
                return (
                  <div key={label}>
                    <p className="hb-period">{label}</p>
                    <div className="hb-slots">
                      {list.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          className={`hb-slot ${s.time === time ? "sel" : ""}`}
                          onClick={() => {
                            setTime(s.time);
                            later(() => go(3));
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {!loading && slots.length > 0 && closed.length > 0 && (
              <p className="hb-note">
                <Clock />
                <span>
                  Sem atendimento{" "}
                  {closed.map((c, i) => (
                    <span key={c}>
                      {i > 0 && " e "}das <b>{c}</b>
                    </span>
                  ))}
                </span>
              </p>
            )}
          </>
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

function ProCard({ name, hint, initial, selected, onClick }: { name: string; hint?: string; initial: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`hb-pro ${selected ? "sel" : ""}`} onClick={onClick} aria-pressed={selected}>
      <span className="hb-av">{initial}</span>
      <span className="hb-pro-n">{name}</span>
      {hint && <span className="hb-pro-d">{hint}</span>}
    </button>
  );
}
