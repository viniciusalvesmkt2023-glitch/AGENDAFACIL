import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleAsaasEvent } from "@/lib/pix/asaas-billing";

// Webhook da Asaas (cobranças e assinaturas). A Asaas envia o token configurado no header "asaas-access-token".
// Sempre responder 200 para eventos válidos: após 15 falhas seguidas a Asaas pausa a fila.
export async function POST(req: NextRequest) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const received = req.headers.get("asaas-access-token") ?? "";
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: Parameters<typeof handleAsaasEvent>[0];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const result = await handleAsaasEvent(body);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    // Erro nosso (ex.: banco fora): devolve 500 para a Asaas tentar de novo
    console.error("[asaas] erro ao processar webhook", e);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
