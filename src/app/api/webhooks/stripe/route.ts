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

function asId(value: { id: string } | string | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function periodEnd(sub: Stripe.Subscription) {
  const end = sub.items?.data?.[0]?.current_period_end;
  return typeof end === "number" ? new Date(end * 1000).toISOString() : null;
}

function tierFor(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") {
    return { tier: "pro", status: "active" };
  }
  if (status === "past_due" || status === "unpaid") {
    return { tier: "pro", status: "past_due" };
  }
  if (status === "canceled") return { tier: "free", status: "canceled" };
  return { tier: "free", status: "inactive" };
}

async function saveSubscription(
  tx: Tx,
  input: {
    userId: string | null;
    customerId: string | null;
    subscriptionId: string | null;
    tier: string;
    status: string;
    periodEnd: string | null;
  }
) {
  if (isUuid(input.userId)) {
    await tx`
      insert into public.subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end
      ) values (
        ${input.userId}, ${input.customerId}, ${input.subscriptionId},
        ${input.tier}, ${input.status}, ${input.periodEnd}
      )
      on conflict (user_id) do update
        set stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
            stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.subscriptions.stripe_subscription_id),
            tier = excluded.tier,
            status = excluded.status,
            current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end)
    `;
    return;
  }
  if (!input.subscriptionId) return;
  await tx`
    update public.subscriptions
    set tier = ${input.tier},
        status = ${input.status},
        stripe_customer_id = coalesce(${input.customerId}, stripe_customer_id),
        current_period_end = coalesce(${input.periodEnd}::timestamptz, current_period_end)
    where stripe_subscription_id = ${input.subscriptionId}
  `;
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id ?? null;
    const kind = session.metadata?.kind;
    if (kind === "pitches") {
      if (!isUuid(userId)) return;
      await tx`
        insert into public.token_ledger (user_id, delta, reason)
        values (${userId}, 15, ${"topup:" + session.id})
        on conflict (user_id, reason) where reason like 'topup:%' do nothing
      `;
      const customer = asId(session.customer);
      if (customer) {
        await tx`
          insert into public.subscriptions (user_id, stripe_customer_id, tier, status)
          values (${userId}, ${customer}, 'free', 'inactive')
          on conflict (user_id) do update
            set stripe_customer_id = coalesce(public.subscriptions.stripe_customer_id, excluded.stripe_customer_id)
        `;
      }
      return;
    }
    if (kind === "pro") {
      await saveSubscription(tx, {
        userId,
        customerId: asId(session.customer),
        subscriptionId: asId(session.subscription),
        tier: "pro",
        status: "active",
        periodEnd: null,
      });
    }
    return;
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const mapped =
      event.type === "customer.subscription.deleted"
        ? { tier: "free", status: "canceled" }
        : tierFor(sub.status);
    await saveSubscription(tx, {
      userId: sub.metadata?.user_id ?? null,
      customerId: asId(sub.customer),
      subscriptionId: sub.id,
      tier: mapped.tier,
      status: mapped.status,
      periodEnd: periodEnd(sub),
    });
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = asId(invoice.parent?.subscription_details?.subscription);
    if (!subscriptionId) return;
    await tx`
      update public.subscriptions
      set status = 'past_due'
      where stripe_subscription_id = ${subscriptionId}
        and status = 'active'
    `;
  }
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
