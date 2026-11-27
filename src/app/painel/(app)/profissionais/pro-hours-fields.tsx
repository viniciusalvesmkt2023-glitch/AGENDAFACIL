"use client";

import { useState } from "react";
import { Check, Clock, Coffee, RotateCcw, X } from "lucide-react";
import { combinePeriods, PERIODS, summarizeWeek, type PeriodId } from "@/lib/pro-hours";

export type HourRow = { weekday: number; isOpen: boolean; startMinutes: number; endMinutes: number; breakStart: number | null; breakEnd: number | null };
type Day = { weekday: number; on: boolean; start: number; end: number; breakStart: number | null; breakEnd: number | null };

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Lista de horários de 15 em 15 min (sempre 24h, igual em qualquer celular)
const TIMES = Array.from({ length: (24 * 60 - 5 * 60) / 15 }, (_, i) => 5 * 60 + i * 15).concat(23 * 60 + 59);

function toDays(rows: HourRow[], fallback: HourRow[]): Day[] {
  return ORDER.map((weekday) => {
    const r = rows.find((x) => x.weekday === weekday) ?? fallback.find((x) => x.weekday === weekday);
    return {
      weekday,
      on: r?.isOpen ?? false,
      start: r?.startMinutes ?? 540,
      end: r?.endMinutes ?? 1080,
      breakStart: r?.breakStart ?? null,
      breakEnd: r?.breakEnd ?? null,
    };
  });
}

/**
 * Horário de trabalho dentro do cadastro do profissional: igual ao do estabelecimento ou próprio
 * (com períodos manhã/tarde/noite que se combinam). Envia os campos que o servidor já entende
 * (open_N, start_N, end_N, breakStart_N, breakEnd_N).
 */
export function ProHoursFields({ name, business, own, initialCustom }: { name: string; business: HourRow[]; own: HourRow[]; initialCustom: boolean }) {
  const [custom, setCustom] = useState(initialCustom);
  // Sem horário próprio ainda: começa pelo do estabelecimento
  const [days, setDays] = useState<Day[]>(() => toDays(own, business));
  const [picked, setPicked] = useState<Set<PeriodId>>(new Set());
  const who = name.trim() || "o profissional";
  const businessSummary = summarizeWeek(business);
  const set = (weekday: number, patch: Partial<Day>) => setDays((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  function togglePeriod(id: PeriodId) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
    const span = combinePeriods(next);
    if (span) setDays((ds) => ds.map((d) => ({ ...d, ...span })));
  }

  const select = (value: number, onChange: (v: number) => void, label: string, small = false) => (
    <select
      className={`pr-time ${small ? "sm" : ""}`}
      value={value}
      aria-label={label}
      onChange={(e) => {
        onChange(Number(e.target.value));
        setPicked(new Set());
      }}
    >
      {(TIMES.includes(value) ? TIMES : [...TIMES, value].sort((a, b) => a - b)).map((m) => (
        <option key={m} value={m}>
          {hm(m)}
        </option>
      ))}
    </select>
  );

  return (
    <section className="pr-hours" aria-label="Horário de trabalho">
      <h3>
        <Clock /> Horário de trabalho
      </h3>
      <p className="pr-d">Quando {who} atende. Os clientes só conseguem marcar nesses horários.</p>

      <input type="hidden" name="hoursMode" value={custom ? "own" : "same"} />
      {custom && <input type="hidden" name="customHours" value="on" />}
      <div className="pr-seg" role="radiogroup" aria-label="Tipo de horário">
        <button type="button" role="radio" aria-checked={!custom} className={!custom ? "on" : ""} onClick={() => setCustom(false)}>
          Igual ao do estabelecimento
          <small>{businessSummary}</small>
        </button>
        <button type="button" role="radio" aria-checked={custom} className={custom ? "on" : ""} onClick={() => setCustom(true)} data-testid="hours-own">
          Horário próprio
          <small>Escolher dias e horas</small>
        </button>
      </div>

      {!custom ? (
        <p className="pr-same">
          Atende <b>nos mesmos dias e horários do estabelecimento</b>. Se o horário do estabelecimento mudar, o dele muda junto.
        </p>
      ) : (
        <>
          <p className="pr-plabel">
            Períodos <span>· pode marcar mais de um</span>
          </p>
          <div className="pr-periods">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" className={picked.has(p.id) ? "on" : ""} aria-pressed={picked.has(p.id)} onClick={() => togglePeriod(p.id)} data-period={p.id}>
                {picked.has(p.id) && (
                  <i>
                    <Check />
                  </i>
                )}
                {p.emoji} {p.label} <small>{`${p.start / 60}–${p.end / 60}h`}</small>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pr-copy"
            onClick={() => {
              setDays(toDays(business, []));
              setPicked(new Set());
            }}
          >
            <RotateCcw /> Igual ao estabelecimento
          </button>

          <div className="pr-days">
            {days.map((d) => (
              <div key={d.weekday} className={`pr-day ${d.on ? "" : "off"}`}>
                <button
                  type="button"
                  className="pr-dn"
                  aria-pressed={d.on}
                  aria-label={`${SHORT[d.weekday]}: ${d.on ? "trabalha" : "folga"}`}
                  onClick={() => set(d.weekday, { on: !d.on })}
                >
                  {SHORT[d.weekday]}
                </button>
                <div className="pr-tt">
                  {d.on ? (
                    <>
                      {select(d.start, (v) => set(d.weekday, { start: v }), `${SHORT[d.weekday]} começa`)}
                      <span>até</span>
                      {select(d.end, (v) => set(d.weekday, { end: v }), `${SHORT[d.weekday]} termina`)}
                      {d.breakStart == null && (
                        <button type="button" className="pr-addl" onClick={() => set(d.weekday, { breakStart: Math.min(Math.max(d.start, 12 * 60), d.end - 60), breakEnd: Math.min(Math.max(d.start, 12 * 60), d.end - 60) + 60 })}>
                          + intervalo
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="pr-folga">Folga</span>
                  )}
                </div>
                {d.on && d.breakStart != null && d.breakEnd != null && (
                  <div className="pr-lunch">
                    <Coffee /> intervalo
                    {select(d.breakStart, (v) => set(d.weekday, { breakStart: v }), `${SHORT[d.weekday]} intervalo começa`, true)}–
                    {select(d.breakEnd, (v) => set(d.weekday, { breakEnd: v }), `${SHORT[d.weekday]} intervalo termina`, true)}
                    <button type="button" className="pr-rm" aria-label="Tirar intervalo" onClick={() => set(d.weekday, { breakStart: null, breakEnd: null })}>
                      <X />
                    </button>
                  </div>
                )}
                {/* campos que vão para o servidor */}
                {d.on && <input type="hidden" name={`open_${d.weekday}`} value="on" />}
                <input type="hidden" name={`start_${d.weekday}`} value={hm(d.start)} />
                <input type="hidden" name={`end_${d.weekday}`} value={hm(d.end)} />
                <input type="hidden" name={`breakStart_${d.weekday}`} value={d.on && d.breakStart != null ? hm(d.breakStart) : ""} />
                <input type="hidden" name={`breakEnd_${d.weekday}`} value={d.on && d.breakEnd != null ? hm(d.breakEnd) : ""} />
              </div>
            ))}
          </div>
          <p className="pr-tip">
            Toque no dia para marcar folga. Folga de um dia só ou férias você marca em <b>Bloqueios</b>.
          </p>
        </>
      )}
    </section>
  );
}
