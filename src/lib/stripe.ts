// Stripe placeholder — Phase 2 (escrow via Stripe Connect) will build on this.
// Phase 1 ships without payments; nothing here charges anyone.

/**
 * Returns a Stripe client once STRIPE_SECRET_KEY is configured.
 * Throws a clear error until then so misconfiguration fails loudly,
 * never silently.
 */
export function getStripe(): never {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured: set STRIPE_SECRET_KEY in .env.local to enable payments (Phase 2)."
    );
  }
  // Phase 2: return new Stripe(key) here.
  throw new Error(
    "Stripe payments are not implemented yet — escrow via Stripe Connect lands in Phase 2."
  );
}

/** True when a Stripe secret key is present (payments still Phase 2). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
