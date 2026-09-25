import Stripe from "stripe";

/** Platform take on a released escrow payment. */
export const PLATFORM_FEE_RATE = 0.05;

/** Existing Stripe prices. Do not create new products. */
export const PRO_MONTHLY_PRICE_ID = "price_1UJgGsCzqBvMqSYFJ5yCk28P";
export const PITCH_TOPUP_PRICE_ID = "price_1UJgGuCzqBvMqSYFSfuH8xXj";

let stripe: Stripe | null = null;

/** True when the secret key is present. Charges stay in Stripe test mode. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Passed into the browser from a Server Component. Not a NEXT_PUBLIC_ variable. */
export function stripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
}

/**
 * Stripe client for Connect and escrow.
 * Throws until STRIPE_SECRET_KEY is set so a missing key never looks like success.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured: set STRIPE_SECRET_KEY in .env.local (test mode) to enable escrow."
    );
  }
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

/** Express account in Canada so payouts stay on Canadian rails. */
export async function createConnectAccount(email: string) {
  return getStripe().accounts.create({
    type: "express",
    country: "CA",
    email: email || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createAccountLink(accountId: string, origin: string) {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings/payouts`,
    return_url: `${origin}/settings/payouts`,
    type: "account_onboarding",
  });
}

export async function createLoginLink(accountId: string) {
  return getStripe().accounts.createLoginLink(accountId);
}
