"use client";

import { useEffect, useMemo } from "react";
import { Clock, Moon, Sun, Sunrise } from "lucide-react";
import { useSlots } from "../use-slots";
import { addDays, formatDateLong, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time";

export type TimeValue = { date?: string; time?: number; label?: string };
type ProDays = { openWeekdays: number[]; closedDates: string[] };

const PERIODS = [
  { key: "manha", label: "Manhã", from: 0, to: 12 * 60, Icon: Sunrise },
  { key: "tarde", label: "Tarde", from: 12 * 60, to: 18 * 60, Icon: Sun },
  { key: "noite", label: "Noite", from: 18 * 60, to: 24 * 60, Icon: Moon },
];
const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T12:00:00Z`);

/**
 * Escolha de dia e horário no visual da página do cliente (dias + blocos Manhã/Tarde/Noite).
 * `pros`: profissionais considerados para saber quais dias estão fechados.
 */
export function TimePicker({
  slug,
  serviceId,
  professionalId,
  pros,
  today,
  maxAdvanceDays,
  token,
  value,
  onChange,
}: {
  slug: string;
  serviceId: string;
  professionalId?: string;
  pros: ProDays[];
  today: string;
  maxAdvanceDays: number;
  /** Remarcação pelo cliente: o próprio agendamento não ocupa o horário */
  token?: string;
  value: TimeValue;
  onChange: (v: TimeValue) => void;
}) {
  const { date, time } = value;
  const { slots, loading, message, closed } = useSlots({ slug, serviceId, professionalId, date, token });
  const days = useMemo(() => Array.from({ length: maxAdvanceDays + 1 }, (_, i) => addDays(today, i)), [today, maxAdvanceDays]);
  const isClosed = useMemo(
    () => (d: string) => pros.every((p) => !p.openWeekdays.includes(weekdayOf(d)) || p.closedDates.includes(d)),
    [pros],
  );

  // Começa no primeiro dia aberto
  useEffect(() => {
    if (!date || isClosed(date)) {
      const first = days.find((d) => !isClosed(d));
      if (first) onChange({ date: first });
    }
  }, [date, days, isClosed, onChange]);

  return (
    <>
      <div className="hb-label-row">
        <span className="hb-label">Dia</span>
        {date && <span className="hb-month">{MONTH.format(asDate(date))}</span>}
      </div>
      <div className="hb-days">
        {days.map((d) => {
          const off = isClosed(d);
          return (
            <button
              key={d}
              type="button"
              disabled={off}
              className={`hb-day ${d === date ? "sel" : ""}`}
              onClick={() => onChange({ date: d })}
              aria-label={`${formatDateLong(d)}${off ? " (fechado)" : ""}`}
            >
              <small>{d === today ? "Hoje" : WEEKDAYS_SHORT[weekdayOf(d)]}</small>
              <b>{Number(d.slice(8))}</b>
              {off && <em>fechado</em>}
            </button>
          );
        })}
      </div>

      <div className="hb-sep" />
      <div className="hb-label-row">
        <span className="hb-label">Horário</span>
        {!loading && slots.length > 0 && <span className="hb-month">{slots.length} livres</span>}
      </div>
      {loading ? (
        <p className="hb-loading">Buscando horários...</p>
      ) : slots.length === 0 ? (
        date && <p className="hb-empty" style={{ marginTop: 0 }}>{message ?? "Nenhum horário livre nesta data. Escolha outro dia."}</p>
      ) : (
        PERIODS.map(({ key, label, from, to, Icon }) => {
          const list = slots.filter((s) => s.time >= from && s.time < to);
          if (!list.length) return null;
          return (
            <div key={key} className="hb-pbox">
              <div className="hb-phead">
                <span className={`hb-pico ${key}`}><Icon /></span>
                <b>{label}</b>
                <small>{list.length} {list.length === 1 ? "horário" : "horários"}</small>
              </div>
              <div className="hb-slots">
                {list.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    className={`hb-slot ${s.time === time ? "sel" : ""}`}
                    onClick={() => onChange({ date, time: s.time, label: s.label })}
                    aria-pressed={s.time === time}
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
  );
}
