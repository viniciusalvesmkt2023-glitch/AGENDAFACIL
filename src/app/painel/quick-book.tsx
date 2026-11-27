"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, PlusCircle, Search, Trash2, X, Zap } from "lucide-react";
import { dayBusy, loadQuickBook, quickBook, searchClients } from "./quick-actions";
import { QUICK_BOOK_EVENT, type QuickBookPreset } from "@/components/quick-book-trigger";
import { PAYMENT_METHODS } from "@/lib/quick-book";
import { formatMoney, formatPhone } from "@/lib/format";
import "./quick-book.css";

type Data = Awaited<ReturnType<typeof loadQuickBook>>;
type Busy = Awaited<ReturnType<typeof dayBusy>>;
type Item = { key: number; serviceId: string; price: string; payment: string };
type Client = { id: string; name: string; phone: string };

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const TIMES = Array.from({ length: (24 * 60 - 5 * 60) / 15 }, (_, i) => 5 * 60 + i * 15);
const toCents = (v: string) => {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
const priceText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Janela de Agendamento rápido (o + laranja do celular, Novo agendamento e horário vazio da agenda). */
export function QuickBook() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [pro, setPro] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(9 * 60);
  const [notes, setNotes] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [every, setEvery] = useState(1);
  const [times, setTimes] = useState(4);
  const [whats, setWhats] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Client[]>([]);
  const [busy, setBusy] = useState<Busy>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const keyRef = useRef(1);
  const preset = useRef<QuickBookPreset>({});

  const servicesById = useMemo(() => new Map((data?.services ?? []).map((s) => [s.id, s])), [data]);
  const proObj = data?.professionals.find((p) => p.id === pro);
  const proServices = (data?.services ?? []).filter((s) => !proObj || proObj.serviceIds.includes(s.id));
  const newItem = (serviceId: string): Item => ({ key: keyRef.current++, serviceId, price: priceText(servicesById.get(serviceId)?.priceCents ?? 0), payment: "PENDING" });

  // Abrir pelo evento (com dia, hora e profissional quando vem da agenda)
  useEffect(() => {
    const onOpen = async (e: Event) => {
      preset.current = (e as CustomEvent<QuickBookPreset>).detail ?? {};
      setOpen(true);
      setError(null);
      const d = data ?? (await loadQuickBook());
      setData(d);
      reset(d, preset.current);
    };
    addEventListener(QUICK_BOOK_EVENT, onOpen);
    return () => removeEventListener(QUICK_BOOK_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function reset(d: Data, p: QuickBookPreset) {
    const firstPro = d.professionals.find((x) => x.id === p.professionalId) ?? d.professionals[0];
    setPro(firstPro?.id ?? "");
    const firstSvc = d.services.find((s) => !firstPro || firstPro.serviceIds.includes(s.id)) ?? d.services[0];
    const map = new Map(d.services.map((s) => [s.id, s]));
    setItems(firstSvc ? [{ key: keyRef.current++, serviceId: firstSvc.id, price: priceText(map.get(firstSvc.id)!.priceCents), payment: "PENDING" }] : []);
    setDate(p.date ?? d.today);
    setTime(p.time ?? Math.min(23 * 60 + 45, Math.ceil((d.now + 1) / 15) * 15));
    setNotes("");
    setRepeat(false);
    setEvery(1);
    setTimes(4);
    setWhats(d.canWhatsapp);
    setClient(null);
    setNewMode(false);
    setNewName("");
    setNewPhone("");
    setQ("");
    setFound([]);
  }

  // Ocupação do dia do profissional (para o aviso de horário livre / encaixe).
  // Busca de novo ao trocar o horário: alguém pode ter agendado pelo link enquanto a janela estava aberta.
  useEffect(() => {
    if (!open || !pro || !date) return;
    let alive = true;
    const t = setTimeout(() => dayBusy(pro, date).then((b) => alive && setBusy(b)), 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, pro, date, time]);

  // Busca de cliente
  useEffect(() => {
    if (q.trim().length < 2 || client) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => searchClients(q).then(setFound), 220);
    return () => clearTimeout(t);
  }, [q, client]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const total = items.reduce((s, i) => s + (servicesById.get(i.serviceId)?.durationMinutes ?? 0), 0);
  const end = time + total;
  const name = proObj?.name ?? "o profissional";
  const status = (() => {
    if (!data) return null;
    if (date < data.today || (date === data.today && time < data.now)) return { ok: false, text: "Esse horário já passou. Dá para marcar mesmo assim (para registrar)." };
    if (!busy) return null;
    const h = busy.hours;
    if (!h) return { ok: false, text: `${name} não trabalha nesse dia. Dá para marcar mesmo assim.` };
    const inBreak = h.breakStart != null && h.breakEnd != null && time < h.breakEnd && end > h.breakStart;
    if (time < h.start || end > h.end || inBreak) return { ok: false, text: `Fora do horário de ${name}. Dá para marcar mesmo assim (encaixe).` };
    if (busy.busy.some((b) => time < b.end && b.start < end)) return { ok: false, text: `${name} já tem cliente nesse horário. Dá para marcar mesmo assim (encaixe).` };
    return { ok: true, text: `Horário livre para ${name} · ${hm(time)} às ${hm(end)}` };
  })();

  async function submit() {
    setError(null);
    if (!client && !newMode) return setError("Escolha o cliente ou toque em + Novo cliente.");
    const parsedItems = items.map((i) => ({ serviceId: i.serviceId, priceCents: toCents(i.price), payment: i.payment }));
    if (parsedItems.some((i) => !Number.isFinite(i.priceCents) || i.priceCents < 0)) return setError("Confira o valor dos serviços.");
    setSaving(true);
    const r = await quickBook({
      professionalId: pro,
      clientId: client?.id,
      newClient: client ? undefined : { name: newName, phone: newPhone },
      items: parsedItems,
      date,
      time,
      notes: notes || undefined,
      repeat: repeat ? { everyWeeks: every, times } : undefined,
      sendWhatsapp: whats && data?.canWhatsapp,
    }).catch(() => ({ ok: false as const, error: "Não foi possível agendar. Tente de novo." }));
    setSaving(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    setToast(
      `Agendado! ${r.count > 1 ? `${r.count} horários criados` : `${date.slice(8)}/${date.slice(5, 7)} às ${hm(time)}`}${whats && data?.canWhatsapp ? " · confirmação enviada no WhatsApp" : ""}`,
    );
    setTimeout(() => setToast(null), 4000);
    router.refresh();
  }

  return (
    <>
      {open && (
        <div className="qb-shade" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="qb-modal" role="dialog" aria-modal="true" aria-label="Agendamento rápido" data-testid="quick-book">
            <div className="qb-head">
              <span className="qb-ic">
                <Zap />
              </span>
              <h2>Agendamento rápido</h2>
              <button type="button" className="qb-x" onClick={() => setOpen(false)} aria-label="Fechar">
                <X />
              </button>
            </div>

            {!data ? (
              <div className="qb-loading">
                <Loader2 className="animate-spin" /> Carregando…
              </div>
            ) : data.professionals.length === 0 || data.services.length === 0 ? (
              <div className="qb-loading">Cadastre pelo menos um profissional e um serviço para agendar.</div>
            ) : (
              <>
                <div className="qb-body">
                  <div className="qb-g2">
                    <label>
                      <span className="qb-lbl">Profissional</span>
                      <select className="qb-in" value={pro} onChange={(e) => setPro(e.target.value)} data-testid="qb-pro">
                        {data.professionals.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="qb-client">
                      <span className="qb-lbl qb-lbl-row">
                        Cliente
                        <button
                          type="button"
                          className="qb-link"
                          onClick={() => {
                            setNewMode(!newMode);
                            setClient(null);
                          }}
                        >
                          {newMode ? "Buscar cadastrado" : "+ Novo cliente"}
                        </button>
                      </span>
                      {newMode ? (
                        <div className="qb-newc">
                          <input className="qb-in" placeholder="Nome do cliente" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="qb-new-name" />
                          <input className="qb-in" placeholder="(11) 99999-9999" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} data-testid="qb-new-phone" />
                        </div>
                      ) : client ? (
                        <div className="qb-chosen">
                          <div className="min-w-0">
                            <b>{client.name}</b>
                            <small>{formatPhone(client.phone)}</small>
                          </div>
                          <button type="button" onClick={() => (setClient(null), setQ(""))} aria-label="Trocar cliente">
                            <X />
                          </button>
                        </div>
                      ) : (
                        <div className="qb-search">
                          <Search />
                          <input className="qb-in" placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" data-testid="qb-client-q" />
                          {found.length > 0 && (
                            <div className="qb-sugg">
                              {found.map((c) => (
                                <button key={c.id} type="button" onClick={() => setClient(c)}>
                                  <span>{c.name}</span>
                                  <small>{formatPhone(c.phone)}</small>
                                </button>
                              ))}
                            </div>
                          )}
                          {q.trim().length >= 2 && found.length === 0 && (
                            <p className="qb-hint">
                              Não achou?{" "}
                              <button type="button" className="qb-link" onClick={() => (setNewMode(true), setNewName(/\d/.test(q) ? "" : q), setNewPhone(/\d/.test(q) ? q : ""))}>
                                Cadastrar “{q.trim()}”
                              </button>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="qb-lbl">Serviços</span>
                    <div className="qb-items">
                      {items.map((it, idx) => (
                        <div key={it.key} className="qb-item">
                          <div className="qb-item-top">
                            <select
                              className="qb-in"
                              value={it.serviceId}
                              aria-label={`Serviço ${idx + 1}`}
                              onChange={(e) => setItems((xs) => xs.map((x) => (x.key === it.key ? { ...x, serviceId: e.target.value, price: priceText(servicesById.get(e.target.value)?.priceCents ?? 0) } : x)))}
                            >
                              {(proServices.some((s) => s.id === it.serviceId) ? proServices : [...proServices, servicesById.get(it.serviceId)!].filter(Boolean)).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} — {formatMoney(s.priceCents).replace(",00", "")}
                                </option>
                              ))}
                            </select>
                            {items.length > 1 && (
                              <button type="button" className="qb-rm" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} aria-label="Tirar serviço">
                                <Trash2 />
                              </button>
                            )}
                          </div>
                          <div className="qb-g2">
                            <label>
                              <span className="qb-lbl">Valor (R$)</span>
                              <input className="qb-in" inputMode="decimal" value={it.price} onChange={(e) => setItems((xs) => xs.map((x) => (x.key === it.key ? { ...x, price: e.target.value } : x)))} />
                            </label>
                            <label>
                              <span className="qb-lbl">Pagamento</span>
                              <select className="qb-in" value={it.payment} onChange={(e) => setItems((xs) => xs.map((x) => (x.key === it.key ? { ...x, payment: e.target.value } : x)))}>
                                <option value="PENDING">A receber</option>
                                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    Pago · {v}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {items.length < 6 && (
                      <button type="button" className="qb-link qb-add" onClick={() => setItems((xs) => [...xs, newItem(proServices[0]?.id ?? data.services[0].id)])}>
                        <PlusCircle /> Adicionar serviço
                      </button>
                    )}
                  </div>

                  <div className="qb-g2">
                    <label>
                      <span className="qb-lbl">Data</span>
                      <input className="qb-in" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} data-testid="qb-date" />
                    </label>
                    <label>
                      <span className="qb-lbl">Horário</span>
                      <select className="qb-in" value={time} onChange={(e) => setTime(Number(e.target.value))} data-testid="qb-time">
                        {(TIMES.includes(time) ? TIMES : [...TIMES, time].sort((a, b) => a - b)).map((m) => (
                          <option key={m} value={m}>
                            {hm(m)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {status && (
                    <p className={`qb-status ${status.ok ? "ok" : "warn"}`} data-testid="qb-status">
                      {status.ok ? <CheckCircle2 /> : "⚠"} {status.text}
                    </p>
                  )}

                  <label>
                    <span className="qb-lbl">Observações</span>
                    <textarea className="qb-in qb-ta" placeholder="Opcional" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
                  </label>

                  <label className="qb-tog">
                    <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} data-testid="qb-repeat" /> Repetir agendamento (cliente fixo)
                  </label>
                  {repeat && (
                    <div className="qb-g2">
                      <label>
                        <span className="qb-lbl">A cada</span>
                        <select className="qb-in" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
                          <option value={1}>1 semana</option>
                          <option value={2}>2 semanas</option>
                          <option value={3}>3 semanas</option>
                          <option value={4}>4 semanas</option>
                        </select>
                      </label>
                      <label>
                        <span className="qb-lbl">Quantas vezes</span>
                        <select className="qb-in" value={times} onChange={(e) => setTimes(Number(e.target.value))} data-testid="qb-times">
                          {[2, 3, 4, 6, 8, 12].map((n) => (
                            <option key={n} value={n}>
                              {n} vezes
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {data.canWhatsapp && (
                    <label className="qb-tog">
                      <input type="checkbox" checked={whats} onChange={(e) => setWhats(e.target.checked)} /> Enviar confirmação no WhatsApp do cliente
                    </label>
                  )}
                  {error && (
                    <p className="qb-status warn" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <div className="qb-foot">
                  <button type="button" className="pn-btn soft" onClick={() => setOpen(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="pn-btn pn-g-brand" onClick={submit} disabled={saving} data-testid="qb-submit">
                    {saving ? <Loader2 className="animate-spin" /> : null} Agendar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className={`qb-toast ${toast ? "on" : ""}`} role="status">
        {toast && (
          <>
            <CheckCircle2 /> {toast}
          </>
        )}
      </div>
    </>
  );
}
