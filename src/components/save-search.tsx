"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveJobSearch } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import type { BudgetType } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

export function SaveSearch({
  filters,
}: {
  filters: {
    province: string;
    remoteOnly: boolean;
    budgetMin: string;
    budgetType: "all" | BudgetType;
    skills: string[];
  };
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  if (!isSupabaseConfigured()) return null;

  if (signedIn === false) {
    return (
      <Button asChild variant="outline" className="h-10 w-full">
        <Link href="/login?next=/jobs">{t("search.signIn")}</Link>
      </Button>
    );
  }

  if (saved) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("search.saved")}{" "}
        <Link href="/settings/alerts" className="font-medium text-primary hover:underline">
          {t("alerts.manage")}
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setOpen(true)}>
        {t("search.save")}
      </Button>
    );
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const formData = new FormData();
        formData.set("name", name);
        formData.set("skills", filters.skills.join(","));
        formData.set("min_budget_cad", filters.budgetMin);
        formData.set("budget_type", filters.budgetType === "all" ? "" : filters.budgetType);
        formData.set("province", filters.remoteOnly ? "" : filters.province);
        formData.set("remote_only", filters.remoteOnly ? "1" : "0");
        const result = await saveJobSearch(formData);
        setPending(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
      }}
    >
      <p className="text-sm text-muted-foreground">{t("search.help")}</p>
      <Label htmlFor="saved-search-name">{t("search.name")}</Label>
      <Input
        id="saved-search-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("search.placeholder")}
        maxLength={80}
        required
        className="h-10"
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? t("search.saving") : t("search.submit")}
      </Button>
    </form>
  );
}
