import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSavedSearch, setAlertFrequency } from "@/lib/job-alerts";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job alerts" };

type SearchRow = {
  id: string;
  name: string;
  alert_frequency: "instant" | "daily" | "off";
  skills: string[] | null;
  min_budget_cad: number | string | null;
  province: string | null;
  remote_only: boolean;
};

export default async function JobAlertsPage() {
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-heading text-4xl tracking-tight">{t("alerts.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("alerts.preview")}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings/alerts");

  const { data } = await supabase
    .from("saved_searches")
    .select("id, name, alert_frequency, skills, min_budget_cad, province, remote_only")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as SearchRow[];
  const frequencies = ["instant", "daily", "off"] as const;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">{t("alerts.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("alerts.lede")}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("alerts.empty")}</p>
      ) : (
        <ul className="mt-8 divide-y">
          {rows.map((row) => (
            <li key={row.id} className="py-4">
              <p className="font-medium">{row.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  row.remote_only ? t("jobs.remoteOnly") : row.province,
                  row.min_budget_cad ? `${row.min_budget_cad} CAD` : null,
                  ...(row.skills ?? []),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <form action={setAlertFrequency} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <label className="text-sm" htmlFor={`freq-${row.id}`}>
                    {t("alerts.frequency")}
                  </label>
                  <select
                    id={`freq-${row.id}`}
                    name="frequency"
                    defaultValue={row.alert_frequency}
                    className="h-10 rounded-lg border bg-background px-3 text-sm"
                  >
                    {frequencies.map((frequency) => (
                      <option key={frequency} value={frequency}>
                        {t(`alerts.${frequency}`)}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" className="h-10">
                    {t("alerts.saveFrequency")}
                  </Button>
                </form>
                <form action={deleteSavedSearch}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" variant="ghost" className="h-10">
                    {t("alerts.delete")}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8">
        <Link href="/jobs" className="font-medium text-primary hover:underline">
          {t("jobs.title")}
        </Link>
      </p>
    </main>
  );
}
