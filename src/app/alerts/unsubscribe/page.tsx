import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Unsubscribe" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const { token } = await searchParams;
  let found = false;
  if (isSupabaseConfigured() && token && UUID.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unsubscribe_job_alert", { token });
    found = data === true;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-heading text-3xl tracking-tight">{t("alerts.unsubscribeTitle")}</h1>
      <p className="mt-4 text-muted-foreground">
        {found ? t("alerts.unsubscribeDone") : t("alerts.unsubscribeMissing")}
      </p>
      <p className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/jobs" className="font-medium text-primary hover:underline">
          {t("alerts.back")}
        </Link>
        <Link href="/settings/alerts" className="font-medium text-primary hover:underline">
          {t("alerts.manage")}
        </Link>
      </p>
    </main>
  );
}
