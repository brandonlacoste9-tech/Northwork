"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { formatCad } from "@/lib/format";
import { fundEscrow, recordEscrowHold, refundEscrow, releaseEscrow } from "@/lib/payments";
import { useT } from "@/components/locale-provider";

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
  const t = useT();
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
        {pending ? t("escrow.authorizing") : t("escrow.authorize")}
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
  subtotalCad,
  feeCad,
  taxCad,
  taxLabel,
  totalCad,
  payoutCad,
  place,
}: {
  jobId: string;
  role: "client" | "freelancer";
  amountCad: number | null;
  status: "held" | "released" | "refunded" | null;
  freelancerConnected: boolean;
  stripeReady: boolean;
  publishableKey: string;
  subtotalCad?: number | null;
  feeCad?: number | null;
  taxCad?: number | null;
  taxLabel?: string | null;
  totalCad?: number | null;
  payoutCad?: number | null;
  place?: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const amountLabel =
    amountCad && amountCad > 0 ? formatCad(amountCad) : "No amount set";
  const summary =
    subtotalCad && feeCad != null && taxCad != null && totalCad && payoutCad
      ? t("escrow.summary", {
          total: formatCad(totalCad),
          subtotal: formatCad(subtotalCad),
          fee: formatCad(feeCad),
          taxLabel: taxLabel ?? "GST",
          tax: formatCad(taxCad),
          payout: formatCad(payoutCad),
        })
      : null;

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
      <h2 className="font-heading text-2xl">{t("escrow.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{summary ?? amountLabel}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("escrow.taxNote", { place: place || t("escrow.placeUnknown") })}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("escrow.dispute")}{" "}
        <Link href="/terms#disputes" className="font-medium text-primary hover:underline">
          {t("footer.terms")}
        </Link>
      </p>
      {status ? (
        <p className="mt-3 text-sm font-medium">
          Status: {status === "held" ? t("escrow.held") : status === "released" ? t("escrow.released") : t("escrow.refunded")}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("escrow.unfunded")}</p>
      )}
      {role === "freelancer" && !freelancerConnected ? (
        <p className="mt-4 text-sm">
          <Link href="/settings/payouts" className="font-medium text-primary hover:underline">
            {t("escrow.connect")}
          </Link>{" "}
          {t("escrow.connectAfter")}
        </p>
      ) : null}
      {role === "client" && !stripeReady ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("escrow.noStripe")}
        </p>
      ) : null}
      {role === "client" && stripeReady && !freelancerConnected ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("escrow.noPayout")}
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
            {pending ? t("escrow.starting") : t("escrow.fund")}
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
            {t("escrow.release")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={pending || !stripeReady}
            onClick={() => run(() => refundEscrow(jobId))}
          >
            {t("escrow.refund")}
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
