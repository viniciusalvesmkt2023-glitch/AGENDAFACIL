"use client";

import { useActionState, useState } from "react";
import { saveWhatsappSettings, sendTestMessage } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
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
};

export function MessagesForm(props: Settings) {
  const [state, action] = useActionState(saveWhatsappSettings, undefined);
  const [enabled, setEnabled] = useState(props.enabled);
  const [confirmationOn, setConfirmationOn] = useState(props.confirmationEnabled);
  const [dayMode, setDayMode] = useState(props.dayMode);
  const [dayTime, setDayTime] = useState(minutesToTime(props.dayTime));
  const [shortMinutes, setShortMinutes] = useState(props.shortMinutes);
  const [conf, setConf] = useState(props.confirmation || DEFAULT_CONFIRMATION);
  const [rem, setRem] = useState(props.reminder || DEFAULT_REMINDER);
  const sample = { ...SAMPLE_VARS, estabelecimento: props.businessName };
  const anyReminder = dayMode !== "OFF" || shortMinutes > 0;

  return (
    <form action={action} className="space-y-6">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="whatsappRemindersEnabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <strong>Mensagens automáticas ligadas</strong>
          <span className="block text-zinc-500">Desmarque para pausar todas as mensagens automáticas.</span>
        </span>
      </label>

      <fieldset disabled={!enabled} className="space-y-6 disabled:opacity-50">
        <div className="rounded-xl border border-zinc-200 p-4">
          <h3 className="mb-3 font-medium">Quando enviar</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="confirmationEnabled"
                checked={confirmationOn}
                onChange={(e) => setConfirmationOn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span>
                <strong>Confirmação</strong> — assim que o cliente agenda
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
              <label className="text-sm font-medium" htmlFor="reminderDayMode">Lembrete antecipado</label>
              <div className="flex flex-wrap items-center gap-2">
                <select id="reminderDayMode" name="reminderDayMode" value={dayMode} onChange={(e) => setDayMode(e.target.value)} className="input w-auto">
                  <option value="OFF">Desligado</option>
                  <option value="24H">24 horas antes</option>
                  <option value="EVENING">Na véspera, em horário fixo</option>
                </select>
                {dayMode === "EVENING" && (
                  <>
                    <span className="text-sm text-zinc-500">às</span>
                    <input type="time" name="reminderDayTime" value={dayTime} onChange={(e) => setDayTime(e.target.value)} min="06:00" max="22:00" step={900} className="input w-auto" />
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
              <label className="text-sm font-medium" htmlFor="reminderShortMinutes">Lembrete próximo do horário</label>
              <select id="reminderShortMinutes" name="reminderShortMinutes" value={shortMinutes} onChange={(e) => setShortMinutes(Number(e.target.value))} className="input w-auto">
                {SHORT_OPTIONS.map((m) => (
                  <option key={m} value={m}>{shortLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <Example confirmationOn={confirmationOn} dayMode={dayMode} dayTime={dayTime} shortMinutes={shortMinutes} />
        </div>

        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          Variáveis que você pode usar nos textos:{" "}
          {MESSAGE_VARIABLES.map((v, i) => (
            <span key={v.key}>
              <code className="rounded bg-white px-1 font-semibold text-brand-700">{`{${v.key}}`}</code> {v.description}
              {i < MESSAGE_VARIABLES.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>

        {confirmationOn && (
          <MessageEditor label="Texto da confirmação" name="msgConfirmation" value={conf} onChange={setConf} defaultText={DEFAULT_CONFIRMATION} preview={renderMessage(conf, sample)} />
        )}
        {anyReminder && (
          <MessageEditor label="Texto dos lembretes" name="msgReminder" value={rem} onChange={setRem} defaultText={DEFAULT_REMINDER} preview={renderMessage(rem, sample)} />
        )}
      </fieldset>

      {/* Mantém os textos ao salvar mesmo com o editor escondido */}
      {(!confirmationOn || !enabled) && <input type="hidden" name="msgConfirmation" value={conf} />}
      {(!anyReminder || !enabled) && <input type="hidden" name="msgReminder" value={rem} />}
      {!enabled && (
        <>
          <input type="hidden" name="reminderDayMode" value={dayMode} />
          <input type="hidden" name="reminderShortMinutes" value={shortMinutes} />
          {confirmationOn && <input type="hidden" name="confirmationEnabled" value="on" />}
          {dayMode === "EVENING" && <input type="hidden" name="reminderDayTime" value={dayTime} />}
        </>
      )}

      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}

/** Exemplo prático com a configuração escolhida. */
function Example({ confirmationOn, dayMode, dayTime, shortMinutes }: { confirmationOn: boolean; dayMode: string; dayTime: string; shortMinutes: number }) {
  // Cliente agendou na segunda às 10:00 para quarta às 15:00
  const lines: string[] = [];
  if (confirmationOn) lines.push("segunda às 10:00 — confirmação");
  if (dayMode === "24H") lines.push("terça às 15:00 — lembrete antecipado");
  if (dayMode === "EVENING") lines.push(`terça às ${dayTime} — lembrete antecipado`);
  if (shortMinutes > 0) lines.push(`quarta às ${minutesToTime(15 * 60 - shortMinutes)} — lembrete`);

  const sameDay: string[] = [];
  if (confirmationOn) sameDay.push("confirmação às 09:00");
  if (shortMinutes > 0 && 16 * 60 - shortMinutes - 60 >= 9 * 60) sameDay.push(`lembrete às ${minutesToTime(16 * 60 - shortMinutes)}`);

  return (
    <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
      <p className="font-medium">Exemplo: cliente agenda na segunda às 10:00 para quarta às 15:00</p>
      {lines.length ? (
        <ul className="mt-1 list-disc pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      ) : (
        <p className="mt-1">Nenhuma mensagem será enviada.</p>
      )}
      <p className="mt-2 text-brand-800">
        Para o mesmo dia (agenda às 09:00 para as 16:00): {sameDay.length ? sameDay.join(" e ") : "nenhuma mensagem"}.
        O lembrete antecipado não é enviado para agendamentos feitos em cima da hora.
      </p>
    </div>
  );
}

function MessageEditor({
  label, name, value, onChange, defaultText, preview,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void; defaultText: string; preview: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor={name}>{label}</label>
          {value !== defaultText && (
            <button type="button" onClick={() => onChange(defaultText)} className="mb-1 text-xs text-brand-600 hover:underline">
              Restaurar padrão
            </button>
          )}
        </div>
        <textarea id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} rows={8} maxLength={MAX_MESSAGE_LENGTH} className="input font-mono text-xs" />
      </div>
      <div>
        <p className="label">Pré-visualização</p>
        <div className="rounded-xl bg-[#e7ffdb] p-3 text-sm whitespace-pre-wrap text-zinc-800 shadow-sm">{preview}</div>
      </div>
    </div>
  );
}

export function TestMessageForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, action] = useActionState(sendTestMessage, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="to">Enviar mensagem de teste para</label>
        <input id="to" name="to" defaultValue={defaultPhone} placeholder="(11) 99999-9999" inputMode="tel" className="input w-56" />
      </div>
      <SubmitButton className="btn-secondary" pendingText="Enviando...">Enviar teste</SubmitButton>
      <div className="w-full"><FormMessage error={state?.error} success={state?.success} /></div>
    </form>
  );
}
