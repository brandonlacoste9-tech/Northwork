import type { Metadata } from "next";
import Link from "next/link";
import { openBillingPortal, startPitchCheckout, startProCheckout } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free and Pro on Northernwork. Prices in CAD.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const locale = await getLocale();
  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const query = await searchParams;
  const configured = isSupabaseConfigured();
  let signedIn = false;
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  const notice =
    query.error === "stripe"
      ? t("pricing.stripeMissing")
      : query.error === "portal"
        ? t("pricing.portalMissing")
        : query.checkout === "pro"
          ? t("pricing.donePro")
          : query.checkout === "pitches"
            ? t("pricing.donePitches")
            : query.checkout === "cancelled"
              ? t("pricing.cancelled")
              : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-medium text-primary">{t("pricing.kicker")}</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">{t("pricing.title")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("pricing.lede")}</p>
      {notice ? <p className="mt-4 text-sm">{notice}</p> : null}
      {!configured ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("pricing.preview")}</p>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.freeName")}</CardTitle>
            <CardDescription className="font-heading text-2xl text-foreground">
              {t("pricing.freePrice")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ul className="grid gap-2 text-sm leading-6">
              <li>{t("pricing.free1")}</li>
              <li>{t("pricing.free2")}</li>
              <li>{t("pricing.free3")}</li>
            </ul>
            {configured && signedIn ? (
              <form action={startPitchCheckout}>
                <Button type="submit" variant="outline" className="h-11">
                  {t("pricing.buy")}
                </Button>
              </form>
            ) : (
              <Button asChild variant="outline" className="h-11 w-fit">
                <Link href={configured ? "/login?next=/pricing" : "/signup"}>
                  {configured ? t("pricing.signIn") : t("pricing.buy")}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("pricing.proName")}</CardTitle>
            <CardDescription className="font-heading text-2xl text-foreground">
              {t("pricing.proPrice")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ul className="grid gap-2 text-sm leading-6">
              <li>{t("pricing.pro1")}</li>
              <li>{t("pricing.pro2")}</li>
              <li>{t("pricing.pro3")}</li>
            </ul>
            {configured && signedIn ? (
              <div className="flex flex-wrap gap-2">
                <form action={startProCheckout}>
                  <Button type="submit" className="h-11">
                    {t("pricing.go")}
                  </Button>
                </form>
                <form action={openBillingPortal}>
                  <Button type="submit" variant="outline" className="h-11">
                    {t("pricing.portal")}
                  </Button>
                </form>
              </div>
            ) : (
              <Button asChild className="h-11 w-fit">
                <Link href={configured ? "/login?next=/pricing" : "/signup"}>
                  {configured ? t("pricing.signIn") : t("pricing.go")}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
