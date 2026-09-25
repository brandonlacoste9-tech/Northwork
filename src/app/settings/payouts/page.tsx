import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PayoutActions } from "@/components/payout-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/backend";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payouts",
  description: "Connect Stripe to receive CAD payouts on Northernwork.",
};

export default async function PayoutsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">
              Payouts are off in preview
            </CardTitle>
            <CardDescription>
              This copy of Northernwork is running on sample data. Connect a
              Supabase project to enable payouts — see the README.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  const accountId = (data as { stripe_account_id: string | null } | null)
    ?.stripe_account_id;

  let chargesEnabled = false;
  let detailsSubmitted = false;
  if (accountId && isStripeConfigured()) {
    try {
      const account = await getStripe().accounts.retrieve(accountId);
      chargesEnabled = Boolean(account.charges_enabled);
      detailsSubmitted = Boolean(account.details_submitted);
    } catch {
      chargesEnabled = false;
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.com</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">Payouts</h1>
      <p className="mt-3 text-muted-foreground">
        Freelancers receive CAD through Stripe Connect. Northernwork keeps 5% when a client releases escrow.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Stripe</CardTitle>
          <CardDescription>
            {chargesEnabled
              ? "Payouts are connected. Clients can fund projects you are hired on."
              : detailsSubmitted
                ? "Stripe has your details and is still finishing review."
                : accountId
                  ? "A Stripe account is started. Finish setup to accept CAD payouts."
                  : "Connect an Express account. This uses Stripe test mode until live keys are added."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayoutActions connected={Boolean(accountId)} stripeReady={isStripeConfigured()} />
        </CardContent>
      </Card>
    </main>
  );
}
