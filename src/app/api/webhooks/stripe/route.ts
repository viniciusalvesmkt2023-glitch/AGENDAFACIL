import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, recordStripeInvoice, syncStripeSubscription } from "@/lib/stripe";

// Webhook da Stripe. Eventos usados:
// checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe não configurada" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    console.warn("[stripe] webhook com assinatura inválida", e);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncStripeSubscription(await stripe.subscriptions.retrieve(subId));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object);
      break;
    case "invoice.paid": {
      const invoice = event.data.object;
      // Formato novo: invoice.parent.subscription_details; formato antigo: invoice.subscription
      const subRef =
        invoice.parent?.subscription_details?.subscription ??
        (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
      const sub = subRef ? (typeof subRef === "string" ? await stripe.subscriptions.retrieve(subRef) : subRef) : null;
      if (sub) await syncStripeSubscription(sub);
      await recordStripeInvoice(invoice, sub);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
