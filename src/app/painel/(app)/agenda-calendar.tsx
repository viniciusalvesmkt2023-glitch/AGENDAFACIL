"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarClock, Check, CheckCheck, MessageCircle, Phone, RotateCcw, UserX, X } from "lucide-react";
import { updateAppointmentStatus } from "@/app/painel/actions";
import { openQuickBook } from "@/components/quick-book-trigger";

export type CalAppt = {
  id: string;
  date: string;
  start: number;
  end: number;
  status: string;
  client: string;
  phone: string;
  service: string;
  price: string;
  professional: string;
  notes: string | null;
  waHref: string;
};

export type CalColumn = {
  key: string;
  date: string;
  proId: string;
  /** cabeçalho: profissional (visão Dia) ou dia da semana (visão Semana) */
  head: { kind: "pro"; name: string; img: string | null; color: string } | { kind: "day"; weekday: string; day: number; href: string };
  hours: { start: number; end: number; breakStart: number | null; breakEnd: number | null } | null;
  blocks: { start: number; end: number; label: string }[];
  appts: CalAppt[];
};

type Props = {
  mode: "dia" | "semana";
  columns: CalColumn[];
  t0: number;
  t1: number;
  today: string;
  timezone: string;
  initialNow: number;
  showProInBlock: boolean;
};

export const STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "Agendado", color: "#8b5cf6" },
  CONFIRMED: { label: "Confirmado", color: "#22c55e" },
  COMPLETED: { label: "Concluído", color: "#3b82f6" },
  NO_SHOW: { label: "Faltou", color: "#f59e0b" },
  CANCELED: { label: "Cancelado", color: "#ef4444" },
};

const H = 104; // altura de 1 hora (30 min = 52px: cabe horário, nome e serviço)
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const WEEKDAY = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function nowMinutes(tz: string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(p.find((x) => x.type === "hour")!.value) * 60 + Number(p.find((x) => x.type === "minute")!.value);
}

/** Agendamentos que se cruzam ficam lado a lado (lane = posição, lanes = quantos no grupo). */
function layout(appts: CalAppt[]) {
  const sorted = [...appts].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: (CalAppt & { lane: number; lanes: number })[] = [];
  let group: (CalAppt & { lane: number; lanes: number })[] = [];
  let groupEnd = -1;
  const flush = () => {
    const cols: number[] = [];
    for (const e of group) {
      let i = cols.findIndex((end) => end <= e.start);
      if (i < 0) {
        i = cols.length;
        cols.push(0);
      }
      cols[i] = e.end;
      e.lane = i;
    }
    for (const e of group) e.lanes = cols.length;
    out.push(...group);
    group = [];
  };
  for (const a of sorted) {
    if (a.start >= groupEnd && group.length) flush();
    group.push({ ...a, lane: 0, lanes: 1 });
    groupEnd = Math.max(groupEnd, a.end);
  }
  if (group.length) flush();
  return out;
}

export function AgendaCalendar({ mode, columns, t0, t1, today, timezone, initialNow, showProInBlock }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const [open, setOpen] = useState<CalAppt | null>(null);
  const [slot, setSlot] = useState<{ date: string; minute: number; proId: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<CalAppt | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const px = (m: number) => ((m - t0) / 60) * H;
  const height = px(t1);
  const hasToday = columns.some((c) => c.date === today);

  // A linha da hora atual anda sozinha; a agenda busca novidades a cada 30 s (só com a aba aberta)
  useEffect(() => {
    const tick = () => setNow(nowMinutes(timezone));
    tick();
    const a = setInterval(tick, 20_000);
    const b = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [router, timezone]);

  // Agendamento novo chegando: aparece com animação e um aviso no topo
  const allIds = useMemo(() => columns.flatMap((c) => c.appts.map((a) => a.id)), [columns]);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(allIds);
      return;
    }
    const added = allIds.filter((id) => !seen.current!.has(id));
    allIds.forEach((id) => seen.current!.add(id));
    if (!added.length) return;
    setFresh(new Set(added));
    const first = columns.flatMap((c) => c.appts).find((a) => a.id === added[0]) ?? null;
    setToast(first);
    const t1_ = setTimeout(() => setToast(null), 5000);
    const t2_ = setTimeout(() => setFresh(new Set()), 1200);
    return () => {
      clearTimeout(t1_);
      clearTimeout(t2_);
    };
  }, [allIds, columns]);

  // Ao abrir: rola até a hora atual (ou até o começo do expediente) e, na semana do celular, até hoje
  useEffect(() => {
    const s = scrollRef.current;
    if (!s) return;
    const first = Math.min(...columns.map((c) => c.hours?.start ?? t1), ...columns.flatMap((c) => c.appts.map((a) => a.start)));
    const target = hasToday && now > t0 && now < t1 ? px(now) - s.clientHeight / 3 : Number.isFinite(first) ? px(first) - 12 : 0;
    s.scrollTop = Math.max(0, target);
    if (mode === "semana") {
      const i = columns.findIndex((c) => c.date === today);
      const col = s.querySelector<HTMLElement>(`[data-col="${i}"]`);
      if (i > 0 && col && s.scrollWidth > s.clientWidth) s.scrollLeft = col.offsetLeft - 60;
    }
    // só ao montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open && !slot) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(null), setSlot(null));
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, slot]);

  const template = `52px repeat(${columns.length}, minmax(${mode === "semana" ? 112 : 150}px, 1fr))`;

  return (
    <>
      <div className={`ag-cal pn-card ag-${mode}`}>
        <div className="ag-scroll" ref={scrollRef}>
          <div className="ag-head" style={{ gridTemplateColumns: template }}>
            <div className="ag-corner" />
            {columns.map((c) =>
              c.head.kind === "pro" ? (
                <div key={c.key} className="ag-hpro">
                  {c.head.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.head.img} alt="" className="ag-av" />
                  ) : (
                    <span className={`ag-av ${c.head.color}`}>{c.head.name.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="truncate">{c.head.name}</span>
                </div>
              ) : (
                <Link key={c.key} href={c.head.href} className={`ag-hday ${c.date === today ? "td" : ""}`}>
                  <small>{c.head.weekday}</small>
                  <b>{c.head.day}</b>
                </Link>
              ),
            )}
          </div>

          <div className="ag-body" style={{ gridTemplateColumns: template }}>
            <div className="ag-gut" style={{ height }}>
              {Array.from({ length: (t1 - t0) / 60 + 1 }, (_, i) => t0 + i * 60).map((m) =>
                m === t0 ? null : (
                  <span key={m} style={{ top: px(m) }}>
                    {hm(m)}
                  </span>
                ),
              )}
              {hasToday && now >= t0 && now <= t1 && (
                <span className="ag-now-tag" style={{ top: px(now) }}>
                  {hm(now)}
                </span>
              )}
            </div>

            {columns.map((c, ci) => {
              const isToday = c.date === today;
              const past = c.date < today ? height : isToday ? Math.max(0, Math.min(height, px(now))) : 0;
              const h = c.hours;
              const slots: number[] = [];
              if (h && c.date >= today) {
                for (let m = h.start; m + 30 <= h.end; m += 30) {
                  if (h.breakStart != null && h.breakEnd != null && m < h.breakEnd && m + 30 > h.breakStart) continue;
                  if (isToday && m + 30 <= now) continue;
                  slots.push(m);
                }
              }
              return (
                <div key={c.key} data-col={ci} className={`ag-col ${isToday && mode === "semana" ? "today" : ""}`} style={{ height }}>
                  {Array.from({ length: ((t1 - t0) / 30) | 0 }, (_, i) => t0 + i * 30).map((m) => (
                    <div key={m} className={`ag-hr ${m % 60 ? "half" : ""}`} style={{ top: px(m) }} />
                  ))}
                  {past > 0 && <div className="ag-past" style={{ height: past }} />}
                  {!h ? (
                    <div className="ag-off closed" style={{ top: 0, height }}>
                      <span>Fechado</span>
                    </div>
                  ) : (
                    <>
                      {h.start > t0 && <div className="ag-off closed" style={{ top: 0, height: px(h.start) }} />}
                      {h.end < t1 && (
                        <div className="ag-off closed" style={{ top: px(h.end), height: height - px(h.end) }}>
                          <span>Fechado</span>
                        </div>
                      )}
                      {h.breakStart != null && h.breakEnd != null && h.breakEnd > h.breakStart && (
                        <div className="ag-off" style={{ top: px(h.breakStart), height: px(h.breakEnd) - px(h.breakStart) }}>
                          <span>Almoço</span>
                        </div>
                      )}
                    </>
                  )}
                  {c.blocks.map((b, i) => (
                    <div key={i} className="ag-off blk" style={{ top: px(Math.max(b.start, t0)), height: px(Math.min(b.end, t1)) - px(Math.max(b.start, t0)) }}>
                      <span>🔒 {b.label}</span>
                    </div>
                  ))}
                  {slots.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="ag-slot"
                      data-t={hm(m)}
                      aria-label={`Marcar às ${hm(m)}`}
                      style={{ top: px(m) + 1, height: H / 2 - 2 }}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setSlot({ date: c.date, minute: m, proId: c.proId, x: r.left, y: r.bottom });
                      }}
                    />
                  ))}
                  {layout(c.appts).map((a) => {
                    const s = STATUS[a.status] ?? { label: a.status, color: "#a1a1aa" };
                    const hpx = ((a.end - a.start) / 60) * H - 3;
                    const short = hpx < 44;
                    const live = isToday && a.start <= now && a.end > now && a.status !== "CANCELED" && a.status !== "NO_SHOW";
                    const w = 100 / a.lanes;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        data-testid="cal-appt"
                        className={`ag-ev ${short ? "short" : ""} ${a.status === "CANCELED" || a.status === "NO_SHOW" ? "x" : ""} ${live ? "live" : ""} ${fresh.has(a.id) ? "pop" : ""}`}
                        title={`${hm(a.start)}–${hm(a.end)} · ${a.client} · ${a.service} · ${a.price} · ${a.professional} · ${s.label}`}
                        style={{
                          ["--c" as string]: s.color,
                          top: px(a.start) + 1,
                          height: Math.max(hpx, 22),
                          left: `calc(${a.lane * w}% + 3px)`,
                          width: `calc(${w}% - 6px)`,
                        }}
                        onClick={() => setOpen(a)}
                      >
                        <span className="t">
                          {hm(a.start)}
                          {!short && <span className="tend"> – {hm(a.end)}</span>}
                          {showProInBlock && <span className="tpro"> · {a.professional}</span>}
                        </span>
                        <b>{a.client}</b>
                        <small>
                          <span className="svc">{a.service}</span>
                          {!short && <span className="pr"> · {a.price}</span>}
                        </small>
                      </button>
                    );
                  })}
                  {isToday && now >= t0 && now <= t1 && <div className="ag-now" style={{ top: px(now) }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="ag-legend">
          {Object.values(STATUS).map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          <span>
            <i className="blk" />
            Bloqueio
          </span>
        </div>
      </div>

      {/* Detalhe do agendamento */}
      <div className={`ag-shade ${open || slot ? "on" : ""} ${slot && !open ? "clear" : ""}`} onClick={() => (setOpen(null), setSlot(null))} />
      <aside className={`ag-sheet ${open ? "on" : ""}`} role="dialog" aria-label="Agendamento" aria-hidden={!open}>
        {open && <Detail a={open} today={today} onClose={() => setOpen(null)} />}
      </aside>

      {slot && (
        <div
          className="ag-popnew"
          // sempre dentro da tela (perto do fim da tela ele abre para cima)
          style={{ left: Math.max(12, Math.min(slot.x, innerWidth - 272)), top: Math.max(12, Math.min(slot.y + 6, innerHeight - 150)) }}
        >
          <b>Novo às {hm(slot.minute)}</b>
          <small>
            {slot.date === today ? "Hoje" : WEEKDAY[new Date(`${slot.date}T12:00:00`).getDay()]}, {slot.date.slice(8)}/{slot.date.slice(5, 7)}
          </small>
          <div className="ag-popacts">
            <button
              type="button"
              className="pn-btn sm pn-g-brand"
              onClick={() => {
                openQuickBook({ date: slot.date, time: slot.minute, professionalId: slot.proId });
                setSlot(null);
              }}
            >
              Marcar horário
            </button>
            <Link className="pn-btn sm soft" href={`/painel/bloqueios?data=${slot.date}`}>
              Bloquear
            </Link>
          </div>
        </div>
      )}

      <div className={`ag-toast ${toast ? "on" : ""}`} role="status">
        {toast && (
          <>
            <i>
              <Bell />
            </i>
            <div>
              <b>Novo agendamento</b>
              <small>
                {toast.client} · {toast.service} · {toast.date === today ? "hoje" : `${toast.date.slice(8)}/${toast.date.slice(5, 7)}`} {hm(toast.start)}
              </small>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Detail({ a, today, onClose }: { a: CalAppt; today: string; onClose: () => void }) {
  const s = STATUS[a.status] ?? { label: a.status, color: "#a1a1aa" };
  const done = a.status === "CANCELED" || a.status === "NO_SHOW" || a.status === "COMPLETED";
  const when = `${a.date === today ? "Hoje" : WEEKDAY[new Date(`${a.date}T12:00:00`).getDay()]}, ${a.date.slice(8)}/${a.date.slice(5, 7)}`;
  return (
    <>
      <div className="ag-grab" />
      <button type="button" className="pn-ib ag-x" onClick={onClose} aria-label="Fechar">
        <X />
      </button>
      <span className="ag-pill" style={{ ["--c" as string]: s.color }}>
        ● {s.label}
      </span>
      <h2>{a.client}</h2>
      <p className="ag-sub">
        {a.service} · {a.price}
      </p>
      <div className="ag-kv">
        <span>Quando</span>
        <b>{when}</b>
        <span>Horário</span>
        <b>
          {hm(a.start)} – {hm(a.end)}
        </b>
        <span>Profissional</span>
        <b>{a.professional}</b>
      </div>
      {a.notes && <p className="ag-note">“{a.notes}”</p>}
      <div className="ag-acts">
        {a.status === "SCHEDULED" && (
          <StatusButton onDone={onClose} id={a.id} status="CONFIRMED" className="pn-btn pn-g-green full">
            <Check /> Confirmar
          </StatusButton>
        )}
        {a.status === "CONFIRMED" && (
          <StatusButton onDone={onClose} id={a.id} status="COMPLETED" className="pn-btn pn-g-green full">
            <CheckCheck /> Concluir
          </StatusButton>
        )}
        {done && (
          <StatusButton onDone={onClose} id={a.id} status="CONFIRMED" className="pn-btn soft full">
            <RotateCcw /> Reabrir
          </StatusButton>
        )}
        <a href={a.waHref} target="_blank" rel="noopener noreferrer" className="pn-btn pn-g-wa">
          <MessageCircle /> WhatsApp
        </a>
        <a href={`tel:+${a.phone}`} className="pn-btn pn-g-blue">
          <Phone /> Ligar
        </a>
        {!done && (
          <>
            <Link href={`/painel/remarcar/${a.id}`} className="pn-btn soft">
              <CalendarClock /> Remarcar
            </Link>
            <StatusButton onDone={onClose} id={a.id} status="NO_SHOW" className="pn-btn soft">
              <UserX /> Faltou
            </StatusButton>
            <StatusButton onDone={onClose} id={a.id} status="CANCELED" className="pn-btn soft full ag-danger">
              <X /> Cancelar agendamento
            </StatusButton>
          </>
        )}
      </div>
    </>
  );
}

function StatusButton({ id, status, className, children, onDone }: { id: string; status: string; className: string; children: React.ReactNode; onDone: () => void }) {
  const full = className.includes("full");
  return (
    // fecha o painel logo depois de enviar (a agenda recarrega com a nova situação)
    <form action={updateAppointmentStatus} className={full ? "ag-full" : ""} onSubmit={() => setTimeout(onDone, 120)}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${className.replace("full", "")} w-full`}>{children}</button>
    </form>
  );
}
