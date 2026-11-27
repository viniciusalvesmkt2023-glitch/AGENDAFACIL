"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/images";
import { parseMoney } from "@/lib/appointments-list";
import { isPaymentMethod } from "@/lib/quick-book";

export type ProductState = { error?: string; success?: string } | undefined;

function refresh() {
  revalidatePath("/painel/produtos");
  revalidatePath("/painel/produtos/estoque");
}

/** Cadastrar ou editar produto (com foto opcional). No cadastro, o estoque inicial vira uma entrada. */
export async function saveProduct(_: ProductState, formData: FormData): Promise<ProductState> {
  const user = await requireActiveUser();
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) return { error: "Informe o nome do produto." };
  const price = parseMoney(formData.get("price"));
  if (price === null) return { error: "Informe o preço de venda." };
  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = costRaw ? parseMoney(costRaw) : null;
  if (costRaw && cost === null) return { error: "Custo inválido." };
  const minRaw = String(formData.get("minStock") ?? "").trim();
  const minStock = minRaw ? Number(minRaw) : null;
  if (minStock !== null && (!Number.isInteger(minStock) || minStock < 0 || minStock > 100000)) return { error: "Aviso de estoque: use um número inteiro." };
  const code = String(formData.get("code") ?? "").trim().slice(0, 40) || null;
  const description = String(formData.get("description") ?? "").trim().slice(0, 600) || null;
  const active = formData.get("active") === "on";

  // Foto (já reduzida no navegador)
  const file = formData.get("image");
  let image: { mime: string; data: Uint8Array<ArrayBuffer> } | null = null;
  if (file instanceof Blob && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return { error: "Foto muito grande. Tente outra." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImage(bytes);
    if (!mime) return { error: "Use uma foto JPG, PNG ou WebP." };
    image = { mime, data: bytes };
  }
  const removeImage = formData.get("removeImage") === "1";
  const data = { name, code, priceCents: price, costCents: cost, minStock, description, active };

  let productId = id;
  let oldImageId: string | null = null;
  if (id) {
    const p = await db.product.findFirst({ where: { id, businessId: user.businessId } });
    if (!p) return { error: "Produto não encontrado." };
    oldImageId = p.imageId;
    await db.product.update({ where: { id }, data });
  } else {
    const stockRaw = String(formData.get("stock") ?? "0").trim() || "0";
    const stock = Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return { error: "Estoque atual: use um número inteiro." };
    const p = await db.product.create({ data: { ...data, businessId: user.businessId, stock } });
    productId = p.id;
    if (stock > 0) {
      await db.stockMove.create({ data: { businessId: user.businessId, productId: p.id, kind: "IN", quantity: stock, balance: stock, note: "Estoque inicial" } });
    }
  }
  if (image || removeImage) {
    const img = image ? await db.businessImage.create({ data: { businessId: user.businessId, kind: "PRODUCT", ...image } }) : null;
    await db.product.update({ where: { id: productId! }, data: { imageId: img?.id ?? null } });
    if (oldImageId) await db.businessImage.deleteMany({ where: { id: oldImageId, businessId: user.businessId } });
  }
  refresh();
  return { success: id ? "Produto atualizado." : "Produto cadastrado." };
}

const qty = z.number().int().min(1, "Quantidade mínima: 1.").max(100000);

/** Tira do estoque só se tiver quantidade suficiente (sem deixar negativo, mesmo com duas vendas ao mesmo tempo). */
async function takeFromStock(businessId: string, productId: string, n: number) {
  const r = await db.product.updateMany({ where: { id: productId, businessId, stock: { gte: n } }, data: { stock: { decrement: n } } });
  if (r.count === 0) return null;
  return db.product.findUnique({ where: { id: productId } });
}

/** Registrar venda: baixa o estoque e guarda valor, pagamento e cliente (opcional). */
export async function sellProduct(input: { productId: string; quantity: number; unitPriceCents: number; paymentMethod: string; clientId?: string | null }) {
  const user = await requireActiveUser();
  const n = qty.safeParse(input.quantity);
  if (!n.success) return { ok: false as const, error: n.error.issues[0].message };
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) return { ok: false as const, error: "Confira o valor." };
  if (!isPaymentMethod(input.paymentMethod)) return { ok: false as const, error: "Escolha a forma de pagamento." };
  const product = await db.product.findFirst({ where: { id: input.productId, businessId: user.businessId } });
  if (!product) return { ok: false as const, error: "Produto não encontrado." };
  if (input.clientId && !(await db.client.findFirst({ where: { id: input.clientId, businessId: user.businessId } }))) return { ok: false as const, error: "Cliente não encontrado." };
  const after = await takeFromStock(user.businessId, product.id, n.data);
  if (!after) return { ok: false as const, error: `Só tem ${product.stock} no estoque.` };
  const total = input.unitPriceCents * n.data;
  await db.stockMove.create({
    data: {
      businessId: user.businessId,
      productId: product.id,
      kind: "SALE",
      quantity: -n.data,
      balance: after.stock,
      totalCents: total,
      paymentMethod: input.paymentMethod,
      clientId: input.clientId || null,
    },
  });
  refresh();
  return { ok: true as const, total, balance: after.stock };
}

/** Lançar entrada (compra/reposição) ou saída (uso interno, perda, quebra). */
export async function moveStock(input: { productId: string; kind: "IN" | "OUT"; quantity: number; note?: string }) {
  const user = await requireActiveUser();
  const n = qty.safeParse(input.quantity);
  if (!n.success) return { ok: false as const, error: n.error.issues[0].message };
  if (input.kind !== "IN" && input.kind !== "OUT") return { ok: false as const, error: "Tipo inválido." };
  const product = await db.product.findFirst({ where: { id: input.productId, businessId: user.businessId } });
  if (!product) return { ok: false as const, error: "Produto não encontrado." };
  let balance: number;
  if (input.kind === "IN") {
    const p = await db.product.update({ where: { id: product.id }, data: { stock: { increment: n.data } } });
    balance = p.stock;
  } else {
    const p = await takeFromStock(user.businessId, product.id, n.data);
    if (!p) return { ok: false as const, error: `Só tem ${product.stock} no estoque.` };
    balance = p.stock;
  }
  await db.stockMove.create({
    data: {
      businessId: user.businessId,
      productId: product.id,
      kind: input.kind,
      quantity: input.kind === "IN" ? n.data : -n.data,
      balance,
      note: (input.note ?? "").trim().slice(0, 160) || null,
    },
  });
  refresh();
  return { ok: true as const, balance };
}
