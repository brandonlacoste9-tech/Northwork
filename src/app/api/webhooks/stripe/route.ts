import { NextResponse } from "next/server";
import type postgres from "postgres";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Tx = postgres.TransactionSql;

function intentId(value: Stripe.PaymentIntent | string | null) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function applyEvent(tx: Tx, event: Stripe.Event) {
  if (
    event.type === "payment_intent.amount_capturable_updated" ||
    event.type === "payment_intent.succeeded"
  ) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const jobId = intent.metadata.job_id;
    const clientId = intent.metadata.client_id;
    const freelancerId = intent.metadata.freelancer_id;
    const amount = Number(intent.metadata.amount_cad);
    const status = event.type === "payment_intent.succeeded" ? "released" : "held";
    if (status === "held" && intent.amount_capturable <= 0) return;
    if (!jobId || !clientId || !freelancerId || !Number.isFinite(amount)) return;
    await tx`
      insert into public.payments (
        job_id, client_id, freelancer_id, amount_cad, stripe_payment_intent_id, status
      ) values (
        ${jobId}, ${clientId}, ${freelancerId}, ${amount}, ${intent.id}, ${status}
      )
      on conflict (stripe_payment_intent_id) do update
        set status = excluded.status,
            updated_at = now()
    `;
    return;
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = intentId(charge.payment_intent);
    if (!paymentIntent) return;
    await tx`
      update public.payments
      set status = 'refunded', updated_at = now()
      where stripe_payment_intent_id = ${paymentIntent}
    `;
    return;
  }

  // payment_intent.payment_failed is recorded for idempotency and does not
  // mark a hold as released.
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { received: false, reason: "not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    const sql = getDb();
    let duplicate = false;
    await sql.begin(async (tx) => {
      const inserted = await tx`
        insert into public.stripe_events (id, type)
        values (${event.id}, ${event.type})
        on conflict (id) do nothing
      `;
      if (inserted.count === 0) {
        duplicate = true;
        return;
      }
      await applyEvent(tx, event);
    });
    return NextResponse.json({ received: true, duplicate });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
