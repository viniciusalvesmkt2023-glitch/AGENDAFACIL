// Endereço do estabelecimento em partes (preenchido pelo CEP) e o texto montado que aparece na página.

export type AddressParts = {
  zipCode: string | null;
  street: string | null;
  addressNumber: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

export const NO_NUMBER = "S/N";

export const cepDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "").slice(0, 8);

/** 01310100 -> 01310-100 (aceita parcial, para a máscara do campo). */
export function formatCep(v: string | null | undefined): string {
  const d = cepDigits(v);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "Rua X, 37 - Sala 2 - Bairro, Cidade - UF" */
export function composeAddress(p: Partial<AddressParts>): string {
  const first = [p.street?.trim(), p.addressNumber?.trim()].filter(Boolean).join(", ");
  const city = [p.city?.trim(), p.state?.trim().toUpperCase()].filter(Boolean).join(" - ");
  const tail = [p.district?.trim(), city].filter(Boolean).join(", ");
  return [first, p.complement?.trim(), tail].filter(Boolean).join(" - ");
}

export type ParsedAddress =
  | { kind: "home" }
  | { kind: "empty" }
  | { kind: "ok"; parts: AddressParts; address: string }
  | { kind: "error"; error: string };

const clean = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** Lê os campos do formulário de endereço (cadastro e configurações). */
export function parseAddress(f: Record<string, unknown>): ParsedAddress {
  if (f.homeService === "on") return { kind: "home" };
  const zip = cepDigits(String(f.zipCode ?? ""));
  const street = clean(f.street, 120);
  const noNumber = f.noNumber === "on";
  const number = noNumber ? NO_NUMBER : clean(f.addressNumber, 20);
  const complement = clean(f.complement, 60);
  const district = clean(f.district, 80);
  const city = clean(f.city, 80);
  const state = clean(f.state, 2).toUpperCase();

  if (!zip && !street && !number && !district && !city) return { kind: "empty" };
  if (String(f.zipCode ?? "").trim() && zip.length !== 8) return { kind: "error", error: "CEP inválido. Ele tem 8 números, ex.: 01310-100." };
  if (!street) return { kind: "error", error: "Informe a rua do endereço." };
  if (!number) return { kind: "error", error: "Informe o número do endereço (ou marque “Sem número”)." };
  if (!district) return { kind: "error", error: "Informe o bairro." };
  if (!city) return { kind: "error", error: "Informe a cidade." };
  if (!/^[A-Z]{2}$/.test(state)) return { kind: "error", error: "Informe o estado (UF), ex.: SP." };

  const parts: AddressParts = { zipCode: zip || null, street, addressNumber: number, complement: complement || null, district, city, state };
  return { kind: "ok", parts, address: composeAddress(parts) };
}

export const EMPTY_ADDRESS: AddressParts = { zipCode: null, street: null, addressNumber: null, complement: null, district: null, city: null, state: null };
