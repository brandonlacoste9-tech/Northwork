import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Alerts" };

const kinds = [
  "invite",
  "pitch",
  "hire",
  "decline",
  "message",
  "payment_held",
  "payment_released",
  "payment_refunded",
  "featured_job",
  "job_alert",
  "job_digest",
] as const;

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data } = await supabase
    .from("notifications")
    .select("id, kind, body, href, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as {
    id: string;
    kind: string;
    body: string;
    href: string | null;
    created_at: string;
    read_at: string | null;
  }[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-heading text-4xl tracking-tight">{t("alert.title")}</h1>
        {rows.some((row) => !row.read_at) ? (
          <form action={markNotificationsRead}>
            <Button type="submit" variant="outline" className="h-10">
              {t("alert.mark")}
            </Button>
          </form>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("alert.email")}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("alert.empty")}</p>
      ) : (
        <ul className="mt-8 divide-y">
          {rows.map((row) => {
            const key = kinds.includes(row.kind as (typeof kinds)[number])
              ? (`alert.${row.kind}` as MessageKey)
              : "alert.message";
            const inner = (
              <>
                <p className="font-medium">{t(key)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA")}
                </p>
              </>
            );
            return (
              <li key={row.id} className={row.read_at ? "py-4 opacity-70" : "py-4"}>
                {row.href ? (
                  <Link href={row.href} className="block hover:underline">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
