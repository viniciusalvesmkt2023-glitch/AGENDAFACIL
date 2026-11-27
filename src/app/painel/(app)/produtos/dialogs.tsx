"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Minus, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { moveStock, saveProduct, sellProduct } from "./actions";
import { searchClients } from "@/app/painel/quick-actions";
import { resizeImage } from "@/lib/resize-image";
import { formatMoney, formatPhone } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/quick-book";

export type ProductLite = {
  id: string;
  name: string;
  code: string | null;
  priceCents: number;
  costCents: number | null;
  stock: number;
  minStock: number | null;
  description: string | null;
  imageId: string | null;
  active: boolean;
};

type Open = { kind: "new" } | { kind: "edit"; id: string } | { kind: "sell"; id?: string } | { kind: "move"; move: "IN" | "OUT"; id?: string };
const EVENT = "horaboa:produto";

/** Abre as janelas de produto de qualquer botão da página. */
export function openProduct(o: Open) {
  window.dispatchEvent(new CustomEvent<Open>(EVENT, { detail: o }));
}

export function ProductButton({ open, className, children, testid, title }: { open: Open; className: string; children: React.ReactNode; testid?: string; title?: string }) {
  return (
    <button type="button" className={className} onClick={() => openProduct(open)} data-testid={testid} title={title} aria-label={title}>
      {children}
    </button>
  );
}

const money = (c: number) => formatMoney(c).replace(",00", "");
const priceText = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const toCents = (v: string) => {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

/** Todas as janelas de produto (uma por vez). */
export function ProductDialogs({ products }: { products: ProductLite[] }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setOpen((e as CustomEvent<Open>).detail);
    addEventListener(EVENT, on);
    return () => removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);
  const done = (msg: string) => {
    setOpen(null);
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };
  const close = () => setOpen(null);
  return (
    <>
      {open && (
        <div className="qb-shade" onClick={(e) => e.target === e.currentTarget && close()}>
          {open.kind === "new" || open.kind === "edit" ? (
            <ProductForm product={open.kind === "edit" ? products.find((p) => p.id === open.id) : undefined} onClose={close} onDone={done} />
          ) : open.kind === "sell" ? (
            <SellForm products={products.filter((p) => p.active)} initial={open.id} onClose={close} onDone={done} />
          ) : (
            <MoveForm products={products} kind={open.move} initial={open.id} onClose={close} onDone={done} />
          )}
        </div>
      )}
      <div className={`qb-toast ${toast ? "on" : ""}`} role="status">
        {toast && (
          <>
            <Check /> {toast}
          </>
        )}
      </div>
    </>
  );
}

function Head({ icon, color, title, onClose }: { icon: React.ReactNode; color: string; title: string; onClose: () => void }) {
  return (
    <div className="qb-head">
      <span className={`qb-ic ${color}`}>{icon}</span>
      <h2>{title}</h2>
      <button type="button" className="qb-x" onClick={onClose} aria-label="Fechar">
        <X />
      </button>
    </div>
  );
}

function ProductForm({ product, onClose, onDone }: { product?: ProductLite; onClose: () => void; onDone: (m: string) => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [photo, setPhoto] = useState<string | null>(product?.imageId ? `/i/${product.imageId}` : null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state?.success) {
      onDone(state.success);
      router.refresh();
    }
  }, [state, onDone, router]);
  const submit = (fd: FormData) => {
    if (file.current) fd.set("image", file.current);
    return action(fd);
  };
  async function pick(f: File) {
    setBusy(true);
    try {
      const blob = await resizeImage(f, { width: 600, aspect: 1 });
      file.current = new File([blob], `produto.${blob.type.split("/")[1]}`, { type: blob.type });
      setPhoto(URL.createObjectURL(blob));
      setRemoved(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form action={submit} className="qb-modal" role="dialog" aria-modal="true" aria-label={product ? "Editar produto" : "Novo produto"} data-testid="product-form">
      <Head icon={<Package />} color="pd-g-teal" title={product ? "Editar produto" : "Novo produto"} onClose={onClose} />
      <div className="qb-body">
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="removeImage" value={removed ? "1" : ""} />
        <div className="pd-photo">
          <button type="button" className="pd-ph" onClick={() => picker.current?.click()} aria-label="Escolher foto">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Foto do produto" />
            ) : busy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ImagePlus />
            )}
          </button>
          <div>
            <b>Foto do produto</b>
            <small>Opcional</small>
            <div className="pd-photo-acts">
              <button type="button" className="pn-btn sm soft" onClick={() => picker.current?.click()}>
                {photo ? "Trocar foto" : "Escolher foto"}
              </button>
              {photo && (
                <button
                  type="button"
                  className="pn-btn sm soft"
                  aria-label="Remover foto"
                  onClick={() => {
                    file.current = null;
                    setPhoto(null);
                    setRemoved(!!product?.imageId);
                  }}
                >
                  <Trash2 />
                </button>
              )}
            </div>
          </div>
          <input ref={picker} type="file" accept="image/*" hidden data-testid="product-photo" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </div>
        <label>
          <span className="qb-lbl">Nome</span>
          <input className="qb-in" name="name" required defaultValue={product?.name} placeholder="Ex.: Pomada Matte 100g" data-testid="pd-name" />
        </label>
        <div className="qb-g2">
          <label>
            <span className="qb-lbl">Preço de venda (R$)</span>
            <input className="qb-in" name="price" inputMode="decimal" required defaultValue={priceText(product?.priceCents ?? null)} placeholder="0,00" data-testid="pd-price" />
          </label>
          <label>
            <span className="qb-lbl">Custo (opcional)</span>
            <input className="qb-in" name="cost" inputMode="decimal" defaultValue={priceText(product?.costCents ?? null)} placeholder="0,00" />
          </label>
        </div>
        <div className="qb-g2">
          {product ? (
            <div>
              <span className="qb-lbl">Estoque atual</span>
              <p className="pd-stocknow">
                <b>{product.stock}</b> un. <small>· mude pelo Controle de estoque</small>
              </p>
            </div>
          ) : (
            <label>
              <span className="qb-lbl">Estoque atual</span>
              <input className="qb-in" name="stock" inputMode="numeric" defaultValue="0" data-testid="pd-stock" />
            </label>
          )}
          <label>
            <span className="qb-lbl">Avisar quando tiver</span>
            <input className="qb-in" name="minStock" inputMode="numeric" defaultValue={product?.minStock ?? ""} placeholder="Ex.: 3" data-testid="pd-min" />
          </label>
        </div>
        <label>
          <span className="qb-lbl">Código de barras (opcional)</span>
          <input className="qb-in" name="code" defaultValue={product?.code ?? ""} placeholder="Ex.: 7891234567890" />
        </label>
        <label>
          <span className="qb-lbl">Descrição (opcional)</span>
          <textarea className="qb-in qb-ta" name="description" defaultValue={product?.description ?? ""} placeholder="Benefícios, modo de uso…" />
        </label>
        <label className="qb-tog">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Disponível para venda
        </label>
        {state?.error && <p className="qb-status warn">⚠ {state.error}</p>}
      </div>
      <div className="qb-foot">
        <button type="button" className="pn-btn soft" onClick={onClose}>
          Cancelar
        </button>
        <button className="pn-btn pn-g-brand" disabled={pending} data-testid="pd-save">
          {pending ? <Loader2 className="animate-spin" /> : null} {product ? "Salvar" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

function ProductSelect({ products, value, onChange }: { products: ProductLite[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className="qb-in" value={value} onChange={(e) => onChange(e.target.value)} data-testid="pd-select">
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.stock} un.)
        </option>
      ))}
    </select>
  );
}

function SellForm({ products, initial, onClose, onDone }: { products: ProductLite[]; initial?: string; onClose: () => void; onDone: (m: string) => void }) {
  const router = useRouter();
  const [id, setId] = useState(initial && products.some((p) => p.id === initial) ? initial : (products[0]?.id ?? ""));
  const p = products.find((x) => x.id === id);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(priceText(p?.priceCents ?? 0));
  const [method, setMethod] = useState("PIX");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [client, setClient] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2 || client) return setFound([]);
    const t = setTimeout(() => searchClients(q).then(setFound), 220);
    return () => clearTimeout(t);
  }, [q, client]);
  if (!p) {
    return (
      <div className="qb-modal" role="dialog" aria-modal="true">
        <Head icon={<ShoppingCart />} color="pn-g-green" title="Registrar venda" onClose={onClose} />
        <div className="qb-loading">Cadastre um produto disponível para vender.</div>
      </div>
    );
  }
  const unit = toCents(price);
  const left = p.stock - qty;
  async function submit() {
    setError(null);
    if (!Number.isFinite(unit) || unit < 0) return setError("Confira o valor.");
    setSaving(true);
    const r = await sellProduct({ productId: p!.id, quantity: qty, unitPriceCents: unit, paymentMethod: method, clientId: client?.id }).catch(() => ({ ok: false as const, error: "Não foi possível registrar." }));
    setSaving(false);
    if (!r.ok) return setError(r.error);
    onDone(`Venda registrada: ${money(r.total)} · ficam ${r.balance} no estoque`);
    router.refresh();
  }
  return (
    <div className="qb-modal" role="dialog" aria-modal="true" aria-label="Registrar venda" data-testid="sell-form">
      <Head icon={<ShoppingCart />} color="pn-g-green" title="Registrar venda" onClose={onClose} />
      <div className="qb-body">
        <div className="qb-g2">
          <label>
            <span className="qb-lbl">Produto</span>
            <ProductSelect
              products={products}
              value={id}
              onChange={(v) => {
                setId(v);
                setPrice(priceText(products.find((x) => x.id === v)?.priceCents ?? 0));
              }}
            />
          </label>
          <div>
            <span className="qb-lbl">Quantidade</span>
            <div className="pd-qty">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Menos">
                <Minus />
              </button>
              <input className="qb-in" inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(9999, Number(e.target.value.replace(/\D/g, "")) || 1)))} data-testid="sell-qty" />
              <button type="button" onClick={() => setQty((n) => n + 1)} aria-label="Mais">
                <Plus />
              </button>
            </div>
          </div>
        </div>
        <div className="qb-g2">
          <label>
            <span className="qb-lbl">Valor de cada (R$)</span>
            <input className="qb-in" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            <span className="qb-lbl">Pagamento</span>
            <select className="qb-in" value={method} onChange={(e) => setMethod(e.target.value)} data-testid="sell-method">
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="qb-client">
          <span className="qb-lbl">Cliente (opcional)</span>
          {client ? (
            <div className="qb-chosen">
              <div className="min-w-0">
                <b>{client.name}</b>
                <small>{formatPhone(client.phone)}</small>
              </div>
              <button type="button" onClick={() => (setClient(null), setQ(""))} aria-label="Tirar cliente">
                <X />
              </button>
            </div>
          ) : (
            <div className="qb-search">
              <Search />
              <input className="qb-in" placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
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
            </div>
          )}
        </div>
        <p className={`qb-status ${left < 0 ? "warn" : "ok"}`} data-testid="sell-total">
          {left < 0
            ? `⚠ Só tem ${p.stock} no estoque`
            : `Total: ${Number.isFinite(unit) ? money(unit * qty) : "—"} · ficam ${left} no estoque`}
        </p>
        {error && <p className="qb-status warn">⚠ {error}</p>}
      </div>
      <div className="qb-foot">
        <button type="button" className="pn-btn soft" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="pn-btn pn-g-brand" disabled={saving || left < 0} onClick={submit} data-testid="sell-go">
          {saving ? <Loader2 className="animate-spin" /> : null} Registrar venda
        </button>
      </div>
    </div>
  );
}

function MoveForm({ products, kind, initial, onClose, onDone }: { products: ProductLite[]; kind: "IN" | "OUT"; initial?: string; onClose: () => void; onDone: (m: string) => void }) {
  const router = useRouter();
  const [id, setId] = useState(initial && products.some((p) => p.id === initial) ? initial : (products[0]?.id ?? ""));
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIn = kind === "IN";
  async function submit() {
    setError(null);
    setSaving(true);
    const r = await moveStock({ productId: id, kind, quantity: Number(qty), note }).catch(() => ({ ok: false as const, error: "Não foi possível registrar." }));
    setSaving(false);
    if (!r.ok) return setError(r.error);
    onDone(`${isIn ? "Entrada" : "Saída"} registrada · estoque agora: ${r.balance}`);
    router.refresh();
  }
  return (
    <div className="qb-modal" role="dialog" aria-modal="true" aria-label={isIn ? "Lançar entrada" : "Lançar saída"} data-testid="move-form">
      <Head icon={isIn ? <Plus /> : <Minus />} color={isIn ? "pn-g-blue" : "pn-g-red"} title={isIn ? "Lançar entrada" : "Lançar saída"} onClose={onClose} />
      {products.length === 0 ? (
        <div className="qb-loading">Cadastre um produto primeiro.</div>
      ) : (
        <>
          <div className="qb-body">
            <label>
              <span className="qb-lbl">Produto</span>
              <ProductSelect products={products} value={id} onChange={setId} />
            </label>
            <label>
              <span className="qb-lbl">Quantidade</span>
              <input className="qb-in" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} data-testid="move-qty" />
            </label>
            <label>
              <span className="qb-lbl">Observação</span>
              <input className="qb-in" value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} placeholder={isIn ? "Ex.: nota 123 do fornecedor" : "Ex.: uso interno, quebrou, perdeu"} />
            </label>
            {error && <p className="qb-status warn">⚠ {error}</p>}
          </div>
          <div className="qb-foot">
            <button type="button" className="pn-btn soft" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="pn-btn pn-g-brand" disabled={saving || !Number(qty)} onClick={submit} data-testid="move-go">
              {saving ? <Loader2 className="animate-spin" /> : null} Registrar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
