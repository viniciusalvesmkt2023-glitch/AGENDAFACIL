"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Download, FileSpreadsheet, Loader2, Search, Upload, X, Zap } from "lucide-react";
import { openQuickBook } from "@/components/quick-book-trigger";
import { PAYMENT_METHODS, methodLabel } from "@/lib/quick-book";
import { previewImport, runImport, setPayment, type ImportPreview } from "./actions";

/** Filtros (situação, profissional, pagamento, busca e datas): mudam a página na hora. */
export function Filters({
  base,
  values,
  professionals,
  showDates,
}: {
  base: Record<string, string>;
  values: { situacao: string; profissional: string; pagamento: string; q: string; de: string; ate: string };
  professionals: { id: string; name: string }[];
  showDates: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(values.q);
  const go = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...base, ...values, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    router.push(`/painel/agendamentos?${p}`);
  };
  // busca: espera a pessoa parar de digitar
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => go({ q }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="am-frow">
      {showDates && (
        <>
          <label>
            <span className="am-lbl">De</span>
            <input type="date" className="am-in" value={values.de} onChange={(e) => go({ de: e.target.value })} />
          </label>
          <label>
            <span className="am-lbl">Até</span>
            <input type="date" className="am-in" value={values.ate} onChange={(e) => go({ ate: e.target.value })} />
          </label>
        </>
      )}
      <label>
        <span className="am-lbl">Situação</span>
        <select className="am-in" value={values.situacao} onChange={(e) => go({ situacao: e.target.value })} data-testid="f-status">
          <option value="">Todas</option>
          <option value="SCHEDULED">Agendado</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="COMPLETED">Concluído</option>
          <option value="NO_SHOW">Faltou</option>
          <option value="CANCELED">Cancelado</option>
        </select>
      </label>
      {professionals.length > 1 && (
        <label>
          <span className="am-lbl">Profissional</span>
          <select className="am-in" value={values.profissional} onChange={(e) => go({ profissional: e.target.value })}>
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span className="am-lbl">Pagamento</span>
        <select className="am-in" value={values.pagamento} onChange={(e) => go({ pagamento: e.target.value })} data-testid="f-pay">
          <option value="">Todos</option>
          <option value="receber">A receber</option>
          <option value="pago">Pago</option>
        </select>
      </label>
      <label className="am-q">
        <span className="am-lbl">Buscar</span>
        <span className="am-search">
          <Search />
          <input className="am-in" placeholder="Cliente, telefone ou serviço" value={q} onChange={(e) => setQ(e.target.value)} data-testid="f-q" />
        </span>
      </label>
    </div>
  );
}

/** Etiqueta "A receber" / "Pago · Pix": toque para marcar o pagamento. */
export function PaymentPill({ id, paid, method, disabled }: { id: string; paid: boolean; method: string | null; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  if (disabled) return <span className="am-pill" style={{ ["--c" as string]: "#a1a1aa" }}>—</span>;
  const label = paid ? `Pago${method ? ` · ${methodLabel(method)}` : ""}` : "A receber";
  const pick = (m: string | null) => {
    setOpen(false);
    start(async () => {
      await setPayment(id, m);
      router.refresh();
    });
  };
  return (
    <div className="am-paywrap" ref={ref}>
      <button type="button" className="am-pill am-pay" style={{ ["--c" as string]: paid ? "#16a34a" : "#f59e0b" }} onClick={() => setOpen(!open)} aria-expanded={open} data-testid="pay-pill">
        {pending ? <Loader2 className="animate-spin" /> : paid ? <Check /> : null}
        {label}
      </button>
      {open && (
        <div className="am-paymenu" role="menu">
          {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
            <button key={k} type="button" role="menuitem" onClick={() => pick(k)} className={paid && method === k ? "on" : ""}>
              Pago · {v}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => pick(null)} className={!paid ? "on" : ""}>
            A receber
          </button>
        </div>
      )}
    </div>
  );
}

export function QuickButton() {
  return (
    <button type="button" className="pn-btn pn-g-brand" onClick={() => openQuickBook()} data-testid="am-quick">
      <Zap /> Agendamento rápido
    </button>
  );
}

/** Exportar e importar planilha. */
export function SheetButtons({ exportHref }: { exportHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    setPreview(await previewImport(fd).catch(() => ({ ok: false as const, error: "Não consegui ler a planilha." })));
    setBusy(false);
  }
  async function confirm() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const r = await runImport(fd).catch(() => ({ ok: false as const, error: "Não foi possível importar." }));
    setBusy(false);
    if (!r.ok) return setPreview({ ok: false, error: r.error });
    setOpen(false);
    setFile(null);
    setPreview(null);
    setDone(`${r.count} agendamento${r.count === 1 ? "" : "s"} importado${r.count === 1 ? "" : "s"}`);
    setTimeout(() => setDone(null), 4000);
    router.refresh();
  }

  return (
    <>
      <a href={exportHref} className="pn-btn pn-g-green" data-testid="am-export">
        <Download /> <span className="am-t">Exportar Excel</span>
      </a>
      <button type="button" className="pn-btn soft" onClick={() => setOpen(true)} data-testid="am-import">
        <Upload /> <span className="am-t">Importar</span>
      </button>
      {open && (
        <div className="qb-shade" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="qb-modal" role="dialog" aria-modal="true" aria-label="Importar agendamentos">
            <div className="qb-head">
              <span className="qb-ic" style={{ background: "linear-gradient(135deg,#60a5fa,#1d4ed8)" }}>
                <FileSpreadsheet />
              </span>
              <h2>Importar agendamentos</h2>
              <button type="button" className="qb-x" onClick={() => setOpen(false)} aria-label="Fechar">
                <X />
              </button>
            </div>
            <div className="qb-body">
              <p className="am-p">Para quem está vindo de outro sistema ou da agenda de papel.</p>
              <ol className="am-steps">
                <li>
                  Baixe a{" "}
                  {/* link comum (download), não navegação do Next */}
                  <a href="/painel/agendamentos/modelo" className="qb-link" download>
                    planilha modelo
                  </a>{" "}
                  (data, horário, cliente, telefone, serviço, profissional, valor, pago).
                </li>
                <li>Preencha no Excel ou no Google Planilhas.</li>
                <li>Envie aqui. Antes de salvar, você vê quantos vão entrar e o que tem problema.</li>
              </ol>
              <button type="button" className="am-drop" onClick={() => inputRef.current?.click()}>
                {busy && !preview ? <Loader2 className="animate-spin" /> : <Upload />}
                <b>{file ? file.name : "Escolher a planilha"}</b>
                <small>.xlsx ou .csv</small>
              </button>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                data-testid="am-import-file"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {preview && !preview.ok && <p className="qb-status warn">⚠ {preview.error}</p>}
              {preview?.ok && (
                <>
                  <p className={`qb-status ${preview.count ? "ok" : "warn"}`} data-testid="am-import-ok">
                    {preview.count ? `✓ ${preview.count} agendamento${preview.count === 1 ? "" : "s"} prontos para importar` : "Nenhum agendamento novo para importar"}
                    {preview.duplicates ? ` · ${preview.duplicates} já existia${preview.duplicates === 1 ? "" : "m"} (não duplica)` : ""}
                  </p>
                  {preview.problemCount > 0 && (
                    <div className="qb-status warn am-probs">
                      <b>
                        ⚠ {preview.problemCount} linha{preview.problemCount === 1 ? "" : "s"} com problema (fica{preview.problemCount === 1 ? "" : "m"} de fora):
                      </b>
                      <ul>
                        {preview.problems.map((p) => (
                          <li key={p.line}>
                            Linha {p.line}: {p.msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="qb-foot">
              <button type="button" className="pn-btn soft" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="pn-btn pn-g-brand" disabled={busy || !preview?.ok || !preview.count} onClick={confirm} data-testid="am-import-go">
                {busy && preview ? <Loader2 className="animate-spin" /> : null}
                Importar{preview?.ok && preview.count ? ` ${preview.count}` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
      {done && (
        <div className="qb-toast on" role="status">
          <Check /> {done}
        </div>
      )}
    </>
  );
}
