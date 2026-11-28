"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, RefreshCw, Timer } from "lucide-react";
import { BrandIcon } from "@/components/ui";
import { renewPix } from "../../actions";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function PixMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5 8.2 6.3a2 2 0 0 1 2.8 0L12 7.3l1-1a2 2 0 0 1 2.8 0L12 2.5Zm-6.4 5.4L2.5 11a1.4 1.4 0 0 0 0 2l3.1 3.1h1a2 2 0 0 0 1.4-.6l2.4-2.4a1 1 0 0 1 1.4 0l2.4 2.4a2 2 0 0 0 1.4.6h1L21.5 13a1.4 1.4 0 0 0 0-2l-3.1-3.1h-1a2 2 0 0 0-1.4.6l-2.4 2.4a1 1 0 0 1-1.4 0L9.7 8.5a2 2 0 0 0-1.4-.6Zm2.6 9.8L12 21.5l3.8-3.8a2 2 0 0 1-2.8 0l-1-1-1 1a2 2 0 0 1-2.8 0Z" />
    </svg>
  );
}

/** "43:12" ou "23:59:12" */
function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // navegadores sem permissão de área de transferência
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Tela do Pix: QR code + copia e cola, contador, e as telas de pago e expirado. */
export function PixScreen(props: {
  id: string;
  initialStatus: string;
  amount: string;
  planName: string;
  months: number;
  code: string;
  qrSvg: string;
  expiresAt: string | null;
  createdAt: string;
  recurring: boolean;
  validUntil: string | null;
}) {
  const [status, setStatus] = useState(props.initialStatus);
  const [validUntil, setValidUntil] = useState(props.validUntil);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const end = props.expiresAt ? new Date(props.expiresAt).getTime() : null;
  const total = end ? Math.max(1, end - new Date(props.createdAt).getTime()) : 1;
  const left = end ? end - now : null;
  const timeUp = left !== null && left <= 0;
  const view = status === "PAID" ? "paid" : status === "EXPIRED" || status === "FAILED" || timeUp ? "expired" : "wait";

  // relógio
  useEffect(() => {
    if (view !== "wait" || !end) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view, end]);

  // consulta a situação a cada 5s (o pagamento confirma pelo aviso do banco)
  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamentos/${props.id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.validUntil) setValidUntil(data.validUntil);
        if (data.status && data.status !== "PENDING") setStatus(data.status);
      } catch {
        // tenta de novo no próximo ciclo
      }
    }, 5000);
    return () => clearInterval(t);
  }, [status, props.id]);

  async function copy() {
    if (await copyText(props.code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }
  }

  if (view === "paid") {
    return (
      <section className="px-done" data-testid="pix-paid">
        {Array.from({ length: 36 }, (_, i) => (
          <i key={i} className="px-conf" style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i % 9) * 0.07}s`, background: ["#fe6e02", "#16a34a", "#32bcad", "#7c3aed", "#facc15"][i % 5] }} />
        ))}
        <div className="px-ok"><Check /></div>
        <h2>Pagamento confirmado!</h2>
        <p>
          Seu plano {props.planName} está ativo{validUntil ? <> até <b>{dateFmt.format(new Date(validUntil))}</b></> : null}. Obrigado por confiar no HoraBoa 🧡
        </p>
        <Link href="/painel" className="px-btn">Voltar para o painel →</Link>
        <Link href="/painel/assinatura" className="px-link">Ver minha assinatura</Link>
      </section>
    );
  }

  if (view === "expired") {
    return (
      <section className="px-done" data-testid="pix-expired">
        <div className="px-ok exp"><Timer /></div>
        <h2>{status === "FAILED" ? "Houve um problema com este Pix" : "Este Pix expirou"}</h2>
        <p>Por segurança, o código Pix tem validade. Gere um novo em um toque: o valor é o mesmo ({props.amount}).</p>
        <form action={renewPix}>
          <input type="hidden" name="id" value={props.id} />
          <button className="px-btn"><RefreshCw /> Gerar novo Pix</button>
        </form>
        <Link href="/painel/assinatura" className="px-link">Escolher outro plano</Link>
      </section>
    );
  }

  return (
    <div className="px-grid" data-testid="pix-wait">
      <section className="px-dark">
        <span className="px-tag"><PixMark /> Pagamento via Pix</span>
        <div className="px-amt"><small>Plano {props.planName} · HoraBoa</small><b>{props.amount}</b></div>
        <div className="px-qr" aria-label="QR code do Pix">
          <div className="px-qrimg" dangerouslySetInnerHTML={{ __html: props.qrSvg }} />
          <span className="px-scan" aria-hidden="true" />
          <span className="px-mid" aria-hidden="true"><BrandIcon className="" /></span>
        </div>
        {left !== null && (
          <>
            <span className="px-timer"><i />Expira em <b>{clock(left)}</b></span>
            <div className="px-tbar"><i style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
          </>
        )}
      </section>

      <section className="px-card">
        <h2>Pague com Pix</h2>
        <p className="px-sub">Liberação automática assim que o banco confirmar.</p>
        <button type="button" className={`px-btn px-copy ${copied ? "ok" : ""}`} onClick={copy} data-testid="pix-copy">
          {copied ? <Check /> : <Copy />}
          {copied ? "Código copiado! Agora cole no app do banco" : "Copiar código Pix"}
        </button>
        <div className="px-code"><small>Pix copia e cola</small><p>{props.code}</p></div>
        <div className="px-steps">
          <div><span>1</span><p><b>Copie o código</b>ou leia o QR code com a câmera do app do banco</p></div>
          <div><span>2</span><p><b>Abra o app do seu banco</b>escolha Pix → Pix copia e cola e cole o código</p></div>
          <div><span>3</span><p><b>Confirme o pagamento</b>esta tela atualiza sozinha quando cair</p></div>
        </div>
        <div className="px-wait"><span className="px-spin" /><p><b>Aguardando pagamento…</b>Pode deixar esta tela aberta.</p></div>
        {props.recurring && (
          <p className="px-auto"><RefreshCw /><span>Ao pagar, seu banco pode oferecer o <b>Pix Automático</b>: autorizando, as próximas renovações são debitadas sozinhas no vencimento.</span></p>
        )}
        <div className="px-sum">
          <span>Plano {props.planName} · {props.months === 1 ? "válido por 1 mês" : `válido por ${props.months} meses`}</span>
          <b>{props.amount}</b>
        </div>
      </section>
    </div>
  );
}
