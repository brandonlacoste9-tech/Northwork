"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  getStripe,
  isStripeConfigured,
  PITCH_TOPUP_PRICE_ID,
  PRO_MONTHLY_PRICE_ID,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pricing");
  return user;
}

async function origin() {
  const h = await headers();
  const fromOrigin = h.get("origin");
  if (fromOrigin) return fromOrigin;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "http://127.0.0.1:43127";
}

async function customerId(userId: string) {
  if (!process.env.DATABASE_URL) return null;
  const rows = await getDb()<{ stripe_customer_id: string | null }[]>`
    select stripe_customer_id
    from public.subscriptions
    where user_id = ${userId}::uuid
    limit 1
  `;
  return rows[0]?.stripe_customer_id ?? null;
}

async function checkout(kind: "pro" | "pitches") {
  const user = await requireUser();
  if (!isStripeConfigured()) redirect("/pricing?error=stripe");
  const base = await origin();
  const existing = await customerId(user.id);
  const session = await getStripe().checkout.sessions.create({
    mode: kind === "pro" ? "subscription" : "payment",
    customer: existing ?? undefined,
    customer_email: existing ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    line_items: [
      {
        price: kind === "pro" ? PRO_MONTHLY_PRICE_ID : PITCH_TOPUP_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${base}/pricing?checkout=${kind}`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
    metadata: { user_id: user.id, kind },
    ...(kind === "pro"
      ? { subscription_data: { metadata: { user_id: user.id } } }
      : {}),
  });
  if (!session.url) redirect("/pricing?error=stripe");
  redirect(session.url);
}

/** Stripe Checkout for Pro at the existing $19 CAD monthly price. */
export async function startProCheckout() {
  await checkout("pro");
}

/** Stripe Checkout for 15 pitches at the existing $12 CAD price. */
export async function startPitchCheckout() {
  await checkout("pitches");
}

/** Stripe Customer Portal so a Pro subscriber can cancel. */
export async function openBillingPortal() {
  const user = await requireUser();
  if (!isStripeConfigured()) redirect("/pricing?error=stripe");
  const customer = await customerId(user.id);
  if (!customer) redirect("/pricing?error=portal");
  const portal = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${await origin()}/pricing`,
  });
  redirect(portal.url);
}
