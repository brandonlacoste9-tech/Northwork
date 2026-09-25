"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  createAccountLink,
  createConnectAccount,
  createLoginLink,
  getStripe,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notify";
import { placeOfSupply, quoteEscrow } from "@/lib/tax";

function friendly(err: unknown) {
  if (err instanceof Error) {
    if (err.message.includes("STRIPE_SECRET_KEY")) {
      return "Escrow needs a Stripe test secret key before any charge can be created.";
    }
    if (err.message.includes("DATABASE_URL")) {
      return "Escrow status cannot be saved until DATABASE_URL is set on the server.";
    }
    return err.message;
  }
  return "That payment step failed.";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function origin() {
  const h = await headers();
  const fromOrigin = h.get("origin");
  if (fromOrigin) return fromOrigin;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "http://127.0.0.1:43127";
}

/** Send the freelancer through Stripe Connect Express onboarding. */
export async function connectPayouts() {
  const { supabase, user } = await requireUser();
  let url = "";
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("profiles").insert({ id: user.id });
      if (error) return { error: error.message };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    let accountId = (profile as { stripe_account_id: string | null } | null)
      ?.stripe_account_id;
    if (!accountId) {
      const account = await createConnectAccount(user.email ?? "");
      accountId = account.id;
      await getDb()`
        update public.profiles
        set stripe_account_id = ${accountId}
        where id = ${user.id}
      `;
    }
    const link = await createAccountLink(accountId, await origin());
    url = link.url;
  } catch (err) {
    return { error: friendly(err) };
  }
  redirect(url);
}

/** Open the Express dashboard for a freelancer who already connected. */
export async function openPayoutDashboard() {
  const { supabase, user } = await requireUser();
  let url = "";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    const accountId = (profile as { stripe_account_id: string | null } | null)
      ?.stripe_account_id;
    if (!accountId) return { error: "Connect payouts before opening the dashboard." };
    const link = await createLoginLink(accountId);
    url = link.url;
  } catch (err) {
    return { error: friendly(err) };
  }
  redirect(url);
}

async function hireForJob(jobId: string) {
  const { supabase, user } = await requireUser();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, client_id, status, budget_cad, location")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  if (!job) throw new Error("That project is not listed.");
  if (job.client_id !== user.id) {
    throw new Error("Only the client can move escrow on this project.");
  }
  if (job.status !== "in_progress") {
    throw new Error("Escrow is available while the project is in progress.");
  }
  const { data: accepted, error: proposalError } = await supabase
    .from("proposals")
    .select("freelancer_id, bid_cad")
    .eq("job_id", jobId)
    .eq("status", "accepted")
    .maybeSingle();
  if (proposalError) throw new Error(proposalError.message);
  if (!accepted) throw new Error("Accept a pitch before funding escrow.");
  const { data: freelancer } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", accepted.freelancer_id)
    .maybeSingle();
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("province")
    .eq("id", user.id)
    .maybeSingle();
  const amount = Number(accepted.bid_cad ?? job.budget_cad);
  return {
    supabase,
    user,
    job,
    freelancerId: accepted.freelancer_id as string,
    stripeAccountId: (freelancer as { stripe_account_id: string | null } | null)
      ?.stripe_account_id,
    amount,
    quote: quoteEscrow(
      amount,
      placeOfSupply(
        job.location as string | null,
        (clientProfile as { province: string | null } | null)?.province,
      ),
    ),
  };
}

/** Create a manual-capture PaymentIntent. The card form confirms it in the browser. */
export async function fundEscrow(jobId: string) {
  try {
    const hire = await hireForJob(jobId);
    if (!hire.stripeAccountId) {
      return { error: "The freelancer needs to connect payouts before this can be funded." };
    }
    if (!Number.isFinite(hire.amount) || hire.amount <= 0) {
      return { error: "Set a CAD amount on the accepted pitch before funding escrow." };
    }
    const { data: existing } = await hire.supabase
      .from("payments")
      .select("status")
      .eq("job_id", jobId)
      .in("status", ["held", "released"])
      .maybeSingle();
    if (existing) return { error: "This project already has escrow funds." };

    const quote = hire.quote;
    const amountCents = Math.round(quote.total * 100);
    const feeCents = Math.round((quote.fee + quote.tax) * 100);
    if (feeCents >= amountCents) {
      return { error: "The project amount is too small to cover the platform fee." };
    }
    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      capture_method: "manual",
      application_fee_amount: feeCents,
      transfer_data: { destination: hire.stripeAccountId },
      metadata: {
        job_id: jobId,
        client_id: hire.user.id,
        freelancer_id: hire.freelancerId,
        amount_cad: String(quote.total),
        subtotal_cad: String(quote.subtotal),
        tax_cad: String(quote.tax),
        tax_label: quote.taxLabel,
      },
    });
    if (!intent.client_secret) return { error: "Stripe did not return a client secret." };
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  } catch (err) {
    return { error: friendly(err) };
  }
}

/** Record a hold once Stripe says the PaymentIntent is ready to capture. */
export async function recordEscrowHold(jobId: string, paymentIntentId: string) {
  try {
    const hire = await hireForJob(jobId);
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata.job_id !== jobId || intent.metadata.client_id !== hire.user.id) {
      return { error: "That payment does not belong to this project." };
    }
    if (intent.status !== "requires_capture") {
      return { error: "The bank has not authorized the hold yet." };
    }
    const quote = hire.quote;
    const { error } = await hire.supabase.from("payments").insert({
      job_id: jobId,
      client_id: hire.user.id,
      freelancer_id: hire.freelancerId,
      amount_cad: quote.total,
      subtotal_cad: quote.subtotal,
      tax_cad: quote.tax,
      tax_label: quote.taxLabel,
      stripe_payment_intent_id: intent.id,
      status: "held",
    });
    if (error && !/duplicate|unique/i.test(error.message)) return { error: error.message };
    await notifyUser(hire.supabase, {
      userId: hire.freelancerId,
      kind: "payment_held",
      body: `${quote.total} CAD`,
      href: `/jobs/${jobId}`,
    });
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return { error: friendly(err) };
  }
}

export async function releaseEscrow(jobId: string) {
  try {
    const hire = await hireForJob(jobId);
    const { data: payment, error } = await hire.supabase
      .from("payments")
      .select("id, stripe_payment_intent_id, status")
      .eq("job_id", jobId)
      .eq("status", "held")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!payment?.stripe_payment_intent_id) {
      return { error: "There is no held payment to release." };
    }
    await getStripe().paymentIntents.capture(payment.stripe_payment_intent_id);
    const { error: updateError } = await hire.supabase
      .from("payments")
      .update({ status: "released", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (updateError) return { error: updateError.message };
    await notifyUser(hire.supabase, {
      userId: hire.freelancerId,
      kind: "payment_released",
      body: "The client released the held payment.",
      href: `/jobs/${jobId}`,
    });
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return { error: friendly(err) };
  }
}

export async function refundEscrow(jobId: string) {
  try {
    const hire = await hireForJob(jobId);
    const { data: payment, error } = await hire.supabase
      .from("payments")
      .select("id, stripe_payment_intent_id, status")
      .eq("job_id", jobId)
      .eq("status", "held")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!payment?.stripe_payment_intent_id) {
      return { error: "There is no held payment to refund." };
    }
    await getStripe().paymentIntents.cancel(payment.stripe_payment_intent_id);
    const { error: updateError } = await hire.supabase
      .from("payments")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (updateError) return { error: updateError.message };
    await notifyUser(hire.supabase, {
      userId: hire.freelancerId,
      kind: "payment_refunded",
      body: "The client cancelled the hold.",
      href: `/jobs/${jobId}`,
    });
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return { error: friendly(err) };
  }
}
