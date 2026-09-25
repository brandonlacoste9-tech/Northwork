import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Stripe webhook stub — Phase 2 will verify signatures and handle
// escrow events (payment holds, releases, disputes) here.
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { received: false, reason: "not configured" },
      { status: 200 }
    );
  }
  // Phase 2: verify STRIPE_WEBHOOK_SECRET signature and dispatch events.
  return NextResponse.json(
    { received: false, reason: "not implemented" },
    { status: 200 }
  );
}
