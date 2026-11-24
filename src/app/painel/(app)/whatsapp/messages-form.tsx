"use client";

import { useActionState, useState } from "react";
import { saveWhatsappSettings, sendTestMessage } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DEFAULT_CONFIRMATION, DEFAULT_REMINDER, MAX_MESSAGE_LENGTH, MESSAGE_VARIABLES, renderMessage, SAMPLE_VARS } from "@/lib/messages";

export function MessagesForm({
  enabled,
  confirmation,
  reminder,
  businessName,
}: {
  enabled: boolean;
  confirmation: string | null;
  reminder: string | null;
  businessName: string;
}) {
  const [state, action] = useActionState(saveWhatsappSettings, undefined);
  const [conf, setConf] = useState(confirmation || DEFAULT_CONFIRMATION);
  const [rem, setRem] = useState(reminder || DEFAULT_REMINDER);
  const sample = { ...SAMPLE_VARS, estabelecimento: businessName };

  return (
    <form action={action} className="space-y-6">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="whatsappRemindersEnabled" defaultChecked={enabled} className="mt-0.5 h-4 w-4 accent-brand-600" />
        <span>
          <strong>Enviar mensagens automáticas</strong>: confirmação ao agendar, lembrete 24 horas antes (para quem agendou com mais de um dia de antecedência) e lembrete 1 hora antes.
        </span>
      </label>

      <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
        Variáveis que você pode usar:{" "}
        {MESSAGE_VARIABLES.map((v, i) => (
          <span key={v.key}>
            <code className="rounded bg-white px-1 font-semibold text-brand-700">{`{${v.key}}`}</code> {v.description}
            {i < MESSAGE_VARIABLES.length - 1 ? " · " : ""}
          </span>
        ))}
      </div>

      <MessageEditor label="Mensagem de confirmação (enviada ao agendar)" name="msgConfirmation" value={conf} onChange={setConf} defaultText={DEFAULT_CONFIRMATION} preview={renderMessage(conf, sample)} />
      <MessageEditor label="Mensagem de lembrete (24h e 1h antes)" name="msgReminder" value={rem} onChange={setRem} defaultText={DEFAULT_REMINDER} preview={renderMessage(rem, sample)} />

      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton>Salvar mensagens</SubmitButton>
    </form>
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
