"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { BellRing, CalendarClock, CheckCircle2, Clock, Scissors, Send, Zap } from "lucide-react";
import { saveWhatsappSettings, sendTestMessage } from "./actions";
import { FormMessage } from "@/components/ui";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, MAX_MESSAGE_LENGTH, MESSAGE_VARIABLES, renderMessage, SAMPLE_VARS } from "@/lib/messages";
import { SHORT_OPTIONS, shortLabel } from "@/lib/reminders";
import { minutesToTime } from "@/lib/time";

type Settings = {
  enabled: boolean;
  confirmationEnabled: boolean;
  dayMode: string;
  dayTime: number;
  shortMinutes: number;
  confirmation: string | null;
  reminder: string | null;
  businessName: string;
  logoUrl?: string | null;
};

const VAR_LABELS: Record<string, string> = { nome: "Nome", estabelecimento: "Estabelecimento", quando: "Data e hora", servico: "Serviço", profissional: "Profissional", link: "Link" };

function SaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="wz-go" disabled={pending}>{pending ? "Salvando..." : "Salvar mensagens"}</button>;
}

function Toggle({ name, checked, onChange, label }: { name?: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="wz-tg">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </span>
  );
}

/** Texto do WhatsApp com *negrito* de verdade. */
function WaText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("*") && p.endsWith("*") && p.length > 2 ? <b key={i}>{p.slice(1, -1)}</b> : p))}</>;
}

export function MessagesForm(props: Settings) {
  const [state, action] = useActionState(saveWhatsappSettings, undefined);
  const [enabled, setEnabled] = useState(props.enabled);
  const [confirmationOn, setConfirmationOn] = useState(props.confirmationEnabled);
  const [dayMode, setDayMode] = useState(props.dayMode);
  const [dayTime, setDayTime] = useState(minutesToTime(props.dayTime));
  const [shortMinutes, setShortMinutes] = useState(props.shortMinutes);
  const [conf, setConf] = useState(props.confirmation || DEFAULT_CONFIRMATION);
  const [rem, setRem] = useState(props.reminder || DEFAULT_REMINDER);
  const [tab, setTab] = useState<"c" | "r">(props.confirmationEnabled || !(props.dayMode !== "OFF" || props.shortMinutes > 0) ? "c" : "r");
  const ta = useRef<HTMLTextAreaElement>(null);
  const sample = { ...SAMPLE_VARS, nome: "Lia", estabelecimento: props.businessName, servico: "Corte", profissional: "João", link: "horaboa.com/agendamento/abc" };
  const anyReminder = dayMode !== "OFF" || shortMinutes > 0;
  const value = tab === "c" ? conf : rem;
  const setValue = tab === "c" ? setConf : setRem;
  const defaultText = tab === "c" ? DEFAULT_CONFIRMATION : DEFAULT_REMINDER;

  function insert(key: string) {
    const el = ta.current;
    const token = `{${key}}`;
    const s = el?.selectionStart ?? value.length;
    const e = el?.selectionEnd ?? value.length;
    const next = (value.slice(0, s) + token + value.slice(e)).slice(0, MAX_MESSAGE_LENGTH);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + token.length, s + token.length);
    });
  }

  // Linha do tempo: cliente agenda na segunda às 10:00 para quarta às 15:00
  const points = [
    { on: confirmationOn, day: "Seg 10:00", label: confirmationOn ? "Confirmação" : "Agendou", icon: <CheckCircle2 /> },
    ...(dayMode !== "OFF" ? [{ on: true, day: dayMode === "24H" ? "Ter 15:00" : `Ter ${dayTime}`, label: "Lembrete", icon: <CalendarClock /> }] : []),
    ...(shortMinutes > 0 ? [{ on: true, day: `Qua ${minutesToTime(15 * 60 - shortMinutes)}`, label: "Lembrete", icon: <BellRing /> }] : []),
    { on: false, day: "Qua 15:00", label: "Atendimento", icon: <Scissors /> },
  ];

  return (
    <form action={action}>
      <div className="wz-sec">
        <div><h2>Mensagens automáticas</h2><small>Escolha o que enviar e quando</small></div>
        <label className="wz-master">
          <span>{enabled ? "Ligadas" : "Pausadas"}</span>
          <Toggle name="whatsappRemindersEnabled" checked={enabled} onChange={setEnabled} label="Ligar ou pausar todas as mensagens automáticas" />
        </label>
      </div>

      <div className={`wz-flow ${enabled ? "" : "paused"}`}>
        <div className={`wz-step ${confirmationOn ? "on" : "off"}`}>
          <div className="wz-top">
            <span className="wz-si" style={{ background: "linear-gradient(135deg,#4ade80,#16a34a)" }}><CheckCircle2 /></span>
            <b>Confirmação</b>
            <Toggle name="confirmationEnabled" checked={confirmationOn} onChange={setConfirmationOn} label="Enviar confirmação" />
          </div>
          <p>Assim que o cliente agenda.</p>
          <span className="wz-when"><Zap /> Na hora</span>
        </div>
        <div className={`wz-step ${dayMode !== "OFF" ? "on" : "off"}`}>
          <div className="wz-top">
            <span className="wz-si" style={{ background: "linear-gradient(135deg,#60a5fa,#1d4ed8)" }}><CalendarClock /></span>
            <b>Lembrete antecipado</b>
          </div>
          <div className="wz-sel">
            <select id="reminderDayMode" name="reminderDayMode" value={dayMode} onChange={(e) => setDayMode(e.target.value)} aria-label="Lembrete antecipado">
              <option value="24H">24 horas antes</option>
              <option value="EVENING">Na véspera, em horário fixo</option>
              <option value="OFF">Desligado</option>
            </select>
            {dayMode === "EVENING" && (
              <input type="time" name="reminderDayTime" value={dayTime} onChange={(e) => setDayTime(e.target.value)} min="06:00" max="22:00" step={900} aria-label="Horário do lembrete da véspera" />
            )}
          </div>
          <span className="wz-when"><Clock /> {dayMode === "OFF" ? "Não envia" : dayMode === "24H" ? "1 dia antes" : `Na véspera às ${dayTime}`}</span>
        </div>
        <div className={`wz-step ${shortMinutes > 0 ? "on" : "off"}`}>
          <div className="wz-top">
            <span className="wz-si" style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}><BellRing /></span>
            <b>Lembrete do dia</b>
          </div>
          <div className="wz-sel">
            <select id="reminderShortMinutes" name="reminderShortMinutes" value={shortMinutes} onChange={(e) => setShortMinutes(Number(e.target.value))} aria-label="Lembrete próximo do horário">
              {[...SHORT_OPTIONS.filter((m) => m > 0), 0].map((m) => <option key={m} value={m}>{shortLabel(m)}</option>)}
            </select>
          </div>
          <span className="wz-when"><Clock /> {shortMinutes > 0 ? "Perto do horário" : "Não envia"}</span>
        </div>
      </div>

      <div className="wz-tl" aria-label="Exemplo de quando as mensagens saem" data-testid="wa-timeline">
        {points.map((p, i) => (
          <div key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="wz-ln" />}
            <div className={`wz-pt ${p.on && enabled ? "on" : ""}`}><i>{p.icon}</i><b>{p.day}</b>{p.label}</div>
          </div>
        ))}
      </div>
      <p className="wz-tlx">
        Exemplo: cliente agenda na segunda às 10:00 para quarta às 15:00.{" "}
        {!enabled ? "Com as mensagens pausadas, nada é enviado." : "Lembretes não saem para agendamentos feitos em cima da hora."}
      </p>

      <div className="wz-ed">
        <div>
          <div className="wz-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "c"} className={tab === "c" ? "on" : ""} onClick={() => setTab("c")}>Confirmação</button>
            <button type="button" role="tab" aria-selected={tab === "r"} className={tab === "r" ? "on" : ""} onClick={() => setTab("r")}>Lembretes</button>
          </div>
          <textarea
            ref={ta}
            className="wz-ta"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label={tab === "c" ? "Texto da confirmação" : "Texto dos lembretes"}
            data-testid="wa-text"
          />
          <div className="wz-vars">
            <small>Toque para inserir no texto:</small>
            {MESSAGE_VARIABLES.map((v) => (
              <button key={v.key} type="button" title={v.description} onClick={() => insert(v.key)}>{VAR_LABELS[v.key] ?? v.key}</button>
            ))}
          </div>
          <div className="wz-edf">
            {value !== defaultText && <button type="button" className="wz-reset" onClick={() => setValue(defaultText)}>Restaurar texto padrão</button>}
            <span className="wz-cnt">{value.length}/{MAX_MESSAGE_LENGTH}</span>
          </div>
          {tab === "c" && !confirmationOn && <p className="wz-tlx">A confirmação está desligada: este texto fica guardado, mas não é enviado.</p>}
          {tab === "r" && !anyReminder && <p className="wz-tlx">Os lembretes estão desligados: este texto fica guardado, mas não é enviado.</p>}
        </div>
        <div className="wz-phone">
          <div className="wz-chat">
            <div className="wz-ch">
              <span className="wz-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {props.logoUrl ? <img src={props.logoUrl} alt="" /> : props.businessName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0"><b className="truncate">{props.businessName}</b><small>prévia de como o cliente recebe</small></div>
            </div>
            <div className="wz-cb">
              <div className="wz-bub" data-testid="wa-preview"><WaText text={renderMessage(value, sample)} /><time>10:02</time></div>
            </div>
          </div>
        </div>
      </div>

      <input type="hidden" name="msgConfirmation" value={conf} />
      <input type="hidden" name="msgReminder" value={rem} />

      <div className="wz-save">
        <div className="wz-saved">{state ? <FormMessage error={state.error} success={state.success} /> : <span className="wz-hint" style={{ fontSize: 13.5, color: "var(--pn-muted)" }}>Quando enviar e o texto das mensagens</span>}</div>
        <SaveButton />
      </div>
    </form>
  );
}

/** Mensagem de teste (fica no bloco escuro de cima). */
export function TestMessageForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, action] = useActionState(sendTestMessage, undefined);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="wz-b1" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Send /> Enviar mensagem de teste
      </button>
      {open && (
        <form action={action} style={{ width: "100%" }}>
          <div className="wz-test">
            <input id="to" name="to" defaultValue={defaultPhone} placeholder="(11) 99999-9999" inputMode="tel" className="wz-in" aria-label="Número para receber o teste" />
            <TestSend />
          </div>
          {state?.error && <p className="wz-msg bad">{state.error}</p>}
          {state?.success && <p className="wz-msg ok">{state.success}</p>}
        </form>
      )}
    </>
  );
}

function TestSend() {
  const { pending } = useFormStatus();
  return <button type="submit" className="wz-b2" disabled={pending}>{pending ? "Enviando..." : "Enviar"}</button>;
}
