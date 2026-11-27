"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { NO_NUMBER, cepDigits, composeAddress, formatCep, type AddressParts } from "@/lib/address";

export type AddressInitial = AddressParts & { address: string | null; homeService: boolean };

type Status = "idle" | "loading" | "found" | "notfound" | "fail";

/**
 * Endereço pelo CEP: a pessoa digita o CEP, rua/bairro/cidade/UF vêm prontos (ViaCEP)
 * e o cursor vai para o número. Campos continuam editáveis. Inclui "Atendo sem endereço fixo".
 */
export function AddressFields({ initial, values }: { initial: AddressInitial; values?: Record<string, string> }) {
  const v = (k: keyof AddressParts) => values?.[k] ?? initial[k] ?? "";
  const startNumber = v("addressNumber");
  const [zip, setZip] = useState(formatCep(v("zipCode")));
  const [street, setStreet] = useState(v("street"));
  const [noNumber, setNoNumber] = useState(values ? values.noNumber === "on" : startNumber === NO_NUMBER);
  const [number, setNumber] = useState(startNumber === NO_NUMBER ? "" : startNumber);
  const [complement, setComplement] = useState(v("complement"));
  const [district, setDistrict] = useState(v("district"));
  const [city, setCity] = useState(v("city"));
  const [uf, setUf] = useState(v("state"));
  const [home, setHome] = useState(values ? values.homeService === "on" : initial.homeService);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(!!(v("street") || v("city")));
  const [flash, setFlash] = useState(0);
  const numberRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const looked = useRef(cepDigits(v("zipCode")));

  async function lookup(d: string) {
    looked.current = d;
    setStatus("loading");
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctl.signal });
      clearTimeout(t);
      const j = (await r.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (looked.current !== d) return; // a pessoa já trocou o CEP
      if (!r.ok || j.erro) {
        setStatus("notfound");
        setOpen(true);
        return;
      }
      setStreet(j.logradouro ?? "");
      setDistrict(j.bairro ?? "");
      setCity(j.localidade ?? "");
      setUf(j.uf ?? "");
      setStatus("found");
      setOpen(true);
      setFlash((n) => n + 1);
      // CEP de cidade inteira não traz a rua: aí o cursor vai para a rua
      setTimeout(() => (j.logradouro ? numberRef.current : streetRef.current)?.focus(), 350);
    } catch {
      if (looked.current !== d) return;
      setStatus("fail");
      setOpen(true);
    }
  }

  function onZip(raw: string) {
    const d = cepDigits(raw);
    setZip(formatCep(d));
    if (d.length === 8 && d !== looked.current) lookup(d);
    if (d.length < 8) {
      looked.current = "";
      setStatus("idle");
    }
  }

  // tira o destaque verde depois da animação
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(0), 1300);
    return () => clearTimeout(t);
  }, [flash]);

  const fill = flash ? "addr-flash" : "";
  const preview = composeAddress({ street, addressNumber: noNumber ? NO_NUMBER : number, complement, district, city, state: uf });
  const legacy = !initial.street && initial.address && !values;

  return (
    <div>
      {!home && (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="zipCode">CEP do estabelecimento</label>
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <input
                  className="input pr-11 font-semibold tabular-nums tracking-wide"
                  id="zipCode"
                  name="zipCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  maxLength={9}
                  value={zip}
                  onChange={(e) => onZip(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-brand-600" />}
                  {status === "found" && <CheckCircle2 className="addr-pop h-6 w-6 fill-emerald-600 text-white" />}
                </span>
              </div>
              <a
                className="shrink-0 text-sm font-semibold text-brand-700 hover:underline"
                href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                target="_blank"
                rel="noopener noreferrer"
              >
                Não sei meu CEP
              </a>
            </div>
            {status === "notfound" && <p className="mt-1.5 text-sm text-red-600">Não achamos esse CEP. Confira os números ou preencha o endereço abaixo.</p>}
            {status === "fail" && <p className="mt-1.5 text-sm text-amber-700">Não deu para buscar o CEP agora. Preencha o endereço abaixo.</p>}
            {legacy && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Endereço atual: <b className="font-semibold text-zinc-700">{initial.address}</b>. Digite o CEP para completar com bairro e cidade.
              </p>
            )}
            {!open && !legacy && (
              <button type="button" className="mt-1.5 text-xs text-zinc-500 underline" onClick={() => setOpen(true)}>
                Preencher o endereço sem o CEP
              </button>
            )}
          </div>

          <div className={`grid transition-[grid-template-rows] duration-500 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-3 pt-1" inert={!open}>
                {street && city && (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{street}{noNumber ? ", S/N" : number ? `, ${number}` : ", nº ?"}</p>
                      <p className="truncate text-xs text-zinc-500">{[district, `${city}/${uf.toUpperCase()}`].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-3">
                  <div>
                    <label className="label" htmlFor="addressNumber">Número</label>
                    <input
                      ref={numberRef}
                      className="input disabled:opacity-50"
                      id="addressNumber"
                      name="addressNumber"
                      inputMode="numeric"
                      placeholder="Ex.: 37"
                      maxLength={20}
                      value={number}
                      disabled={noNumber}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                    <label className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <input type="checkbox" name="noNumber" checked={noNumber} onChange={(e) => setNoNumber(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                      Sem número
                    </label>
                  </div>
                  <div>
                    <label className="label" htmlFor="complement">Complemento <span className="font-normal text-zinc-400">(opcional)</span></label>
                    <input className="input" id="complement" name="complement" placeholder="Sala 2, fundos..." maxLength={60} value={complement} onChange={(e) => setComplement(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="street">Rua</label>
                  <input ref={streetRef} className={`input ${fill}`} id="street" name="street" maxLength={120} value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px]">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label" htmlFor="district">Bairro</label>
                    <input className={`input ${fill}`} id="district" name="district" maxLength={80} value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="city">Cidade</label>
                    <input className={`input ${fill}`} id="city" name="city" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="state">UF</label>
                    <input className={`input uppercase ${fill}`} id="state" name="state" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} />
                  </div>
                </div>
                {preview && (
                  <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-center text-xs text-zinc-500">
                    Como aparece na sua página: <b className="font-semibold text-zinc-800">{preview}</b>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <label className={`flex items-center gap-2 text-sm text-zinc-700 ${home ? "" : "mt-3"}`}>
        <input type="checkbox" name="homeService" checked={home} onChange={(e) => setHome(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        Atendo sem endereço fixo (a domicílio)
      </label>
    </div>
  );
}
