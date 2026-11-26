"use client";

import { useActionState, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays } from "lucide-react";
import { rescheduleByClient } from "../actions";
import { TimePicker, type TimeValue } from "@/components/public/time-picker";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** "Sex, 27/11" (curto, para caber na barra junto do botão) */
const nice = (d: string) => `${WD[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${d.slice(8)}/${d.slice(5, 7)}`;

/** Troca de dia/horário pelo cliente, no mesmo visual do agendamento. */
export function RescheduleForm(props: {
  token: string;
  slug: string;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  current: string;
  today: string;
  maxAdvanceDays: number;
  pro: { openWeekdays: number[]; closedDates: string[] };
}) {
  const [state, action] = useActionState(rescheduleByClient, undefined);
  const [value, setValue] = useState<TimeValue>({});
  const onChange = useCallback((v: TimeValue) => setValue(v), []);
  const ready = value.date && value.time !== undefined;

  return (
    <form action={action}>
      <input type="hidden" name="token" value={props.token} />
      <input type="hidden" name="date" value={value.date ?? ""} />
      <input type="hidden" name="time" value={value.time ?? ""} />
      <section className="hb-card hb-glass">
        <p className="hb-eyebrow">Trocar horário</p>
        <h1 className="hb-title">Escolha o novo dia e horário</h1>
        <p className="hb-legal" style={{ marginTop: 6, fontSize: 13.5 }}>
          {props.serviceName} com {props.professionalName}. Hoje está marcado para <b style={{ color: "var(--fg)" }}>{props.current}</b>.
        </p>
        <div className="hb-stage">
          <TimePicker
            slug={props.slug}
            serviceId={props.serviceId}
            professionalId={props.professionalId}
            pros={[props.pro]}
            today={props.today}
            maxAdvanceDays={props.maxAdvanceDays}
            token={props.token}
            value={value}
            onChange={onChange}
          />
        </div>
        {state?.error && <p className="hb-error">{state.error}</p>}
      </section>
      {ready && (
        <>
          <div className="hb-bar-space" />
          <div className="hb-bar hb-glass" role="region" aria-label="Novo horário">
            <span className="hb-bar-thumb time"><CalendarDays /></span>
            <span className="hb-bar-txt">
              <b>{nice(value.date!)} · {value.label}</b>
              <small>Novo horário</small>
            </span>
            <SubmitChange />
          </div>
        </>
      )}
    </form>
  );
}

function SubmitChange() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="hb-btn hb-btn-green" style={{ width: "auto", margin: 0, height: 48, padding: "0 18px" }} disabled={pending}>
      {pending ? "Trocando..." : "Confirmar troca"}
    </button>
  );
}
