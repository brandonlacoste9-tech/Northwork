import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteSavedSearch, updateSavedSearchFrequency } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatJobBudget } from "@/lib/format";
import { provinceLabel, type Province } from "@/lib/place";
import { PROVINCES } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job alerts" };

type SavedSearch = {
  id: string;
  name: string;
  skills: string[] | null;
  min_budget_cad: number | string | null;
  budget_type: string | null;
  province: string | null;
  remote_only: boolean;
  alert_frequency: "instant" | "daily" | "off";
};

function describe(row: SavedSearch, t: (key: MessageKey, vars?: Record<string, string | number>) => string, locale: "en" | "fr") {
  const parts: string[] = [];
  if (row.remote_only) parts.push(t("search.remote"));
  else if (row.province && (PROVINCES as readonly string[]).includes(row.province)) {
    parts.push(provinceLabel(row.province as Province, locale));
  } else parts.push(t("search.anyPlace"));
  if (row.budget_type === "hourly") parts.push(t("jobs.typeHourly"));
  else if (row.budget_type === "fixed") parts.push(t("jobs.typeFixed"));
  else parts.push(t("search.anyType"));
  const min = Number(row.min_budget_cad);
  if (Number.isFinite(min) && min > 0) {
    parts.push(t("search.min", { amount: formatJobBudget(min, min, "fixed", locale).replace(" CAD", "") }));
  }
  if (row.skills && row.skills.length > 0) parts.push(row.skills.join(", "));
  return parts.join(" · ");
}

export default async function JobAlertsPage() {
  const locale = await getLocale();
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">{t("alerts.preview")}</CardTitle>
            <CardDescription>{t("alerts.previewBody")}</CardDescription>
          </CardHeader>
        </Card>
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
    .select("id, name, skills, min_budget_cad, budget_type, province, remote_only, alert_frequency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as SavedSearch[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">{t("alerts.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("alerts.lede")}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {t("alerts.empty")}{" "}
          <Link href="/jobs" className="font-medium text-primary hover:underline">
            {t("alerts.back")}
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{row.name}</CardTitle>
                  <CardDescription>{describe(row, t, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <form action={updateSavedSearchFrequency} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <label className="grid gap-1 text-sm">
                      {t("alerts.frequency")}
                      <select
                        name="alert_frequency"
                        defaultValue={row.alert_frequency}
                        className="h-10 rounded-lg border bg-background px-3"
                      >
                        <option value="instant">{t("alerts.instant")}</option>
                        <option value="daily">{t("alerts.daily")}</option>
                        <option value="off">{t("alerts.off")}</option>
                      </select>
                    </label>
                    <Button type="submit" variant="outline" className="h-10">
                      {t("alerts.update")}
                    </Button>
                  </form>
                  <form action={deleteSavedSearch}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" variant="ghost" className="h-10 px-3 text-destructive">
                      {t("alerts.delete")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
