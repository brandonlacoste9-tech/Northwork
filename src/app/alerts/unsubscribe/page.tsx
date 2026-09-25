import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeWithToken } from "@/lib/job-alerts";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const { token } = await searchParams;
  const ok = token ? await unsubscribeWithToken(token) : false;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-heading text-4xl tracking-tight">
        {ok ? t("alerts.unsubscribeDone") : t("alerts.unsubscribeInvalid")}
      </h1>
      <p className="mt-4">
        <Link href="/settings/alerts" className="font-medium text-primary hover:underline">
          {t("alerts.manage")}
        </Link>
      </p>
    </main>
  );
}
