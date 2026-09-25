"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { formatCad } from "@/lib/format";
import { fundEscrow, recordEscrowHold, refundEscrow, releaseEscrow } from "@/lib/payments";

const stripeCache = new Map<string, Promise<Stripe | null>>();

function stripePromise(publishableKey: string) {
  const existing = stripeCache.get(publishableKey);
  if (existing) return existing;
  const created = loadStripe(publishableKey);
  stripeCache.set(publishableKey, created);
  return created;
}

function HoldForm({
  jobId,
  onDone,
}: {
  jobId: string;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "The bank did not authorize the hold.");
      setPending(false);
      return;
    }
    const paymentIntentId = result.paymentIntent?.id;
    if (!paymentIntentId) {
      setError("Stripe did not return the hold.");
      setPending(false);
      return;
    }
    const recorded = await recordEscrowHold(jobId, paymentIntentId);
    if (recorded?.error) {
      setError(recorded.error);
      setPending(false);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
      <PaymentElement />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !stripe} className="h-11 px-5 sm:w-fit">
        {pending ? "Authorizing…" : "Authorize hold"}
      </Button>
    </form>
  );
}

export function EscrowPanel({
  jobId,
  role,
  amountCad,
  status,
  freelancerConnected,
  stripeReady,
  publishableKey,
}: {
  jobId: string;
  role: "client" | "freelancer";
  amountCad: number | null;
  status: "held" | "released" | "refunded" | null;
  freelancerConnected: boolean;
  stripeReady: boolean;
  publishableKey: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const amountLabel =
    amountCad && amountCad > 0 ? formatCad(amountCad) : "No amount set";

  async function run(action: () => Promise<{ error?: string; ok?: boolean } | undefined>) {
    setPending(true);
    setError(null);
    const result = await action();
    if (result?.error) setError(result.error);
    setPending(false);
    router.refresh();
  }

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="font-heading text-2xl">Escrow</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {amountLabel}. Funds stay held in CAD until the client releases them. Northernwork keeps a 5% fee on release.
      </p>
      {status ? (
        <p className="mt-3 text-sm font-medium">
          Status: {status === "held" ? "Held" : status === "released" ? "Released" : "Refunded"}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Not funded yet.</p>
      )}
      {role === "freelancer" && !freelancerConnected ? (
        <p className="mt-4 text-sm">
          <Link href="/settings/payouts" className="font-medium text-primary hover:underline">
            Connect payouts
          </Link>{" "}
          before the client can fund this project.
        </p>
      ) : null}
      {role === "client" && !stripeReady ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Funding needs Stripe test keys (STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY). Nothing is charged until those are set.
        </p>
      ) : null}
      {role === "client" && stripeReady && !freelancerConnected ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The hired freelancer has not connected payouts yet.
        </p>
      ) : null}
      {role === "client" && stripeReady && freelancerConnected && !status ? (
        <div className="mt-4">
          <Button
            type="button"
            className="h-11 px-5"
            disabled={pending || Boolean(clientSecret)}
            onClick={async () => {
              setPending(true);
              setError(null);
              const result = await fundEscrow(jobId);
              if (result?.error) setError(result.error);
              if (result && "clientSecret" in result && result.clientSecret) {
                setClientSecret(result.clientSecret);
              }
              setPending(false);
            }}
          >
            {pending ? "Starting…" : "Fund escrow"}
          </Button>
          {clientSecret ? (
            <Elements stripe={stripePromise(publishableKey)} options={{ clientSecret }}>
              <HoldForm
                jobId={jobId}
                onDone={() => {
                  setClientSecret(null);
                  router.refresh();
                }}
              />
            </Elements>
          ) : null}
        </div>
      ) : null}
      {role === "client" && status === "held" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-10 px-4"
            disabled={pending || !stripeReady}
            onClick={() => run(() => releaseEscrow(jobId))}
          >
            Release payment
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={pending || !stripeReady}
            onClick={() => run(() => refundEscrow(jobId))}
          >
            Request refund
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
