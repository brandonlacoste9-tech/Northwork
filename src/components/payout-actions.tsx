"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { connectPayouts, openPayoutDashboard } from "@/lib/payments";

export function PayoutActions({
  connected,
  stripeReady,
}: {
  connected: boolean;
  stripeReady: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ error: string } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="grid gap-3">
      {stripeReady ? null : (
        <p className="text-sm text-muted-foreground">
          Payouts use Stripe test mode. Add STRIPE_SECRET_KEY before connecting an account. No live charges are sent from this screen.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10 px-4"
          disabled={pending}
          onClick={() => run(connectPayouts)}
        >
          {pending ? "Opening Stripe…" : connected ? "Continue Stripe setup" : "Connect Stripe"}
        </Button>
        {connected ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={pending}
            onClick={() => run(openPayoutDashboard)}
          >
            Open Stripe dashboard
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
