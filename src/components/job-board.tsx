"use client";

import { useMemo, useState } from "react";
import { DirectoryEmpty, DirectoryError, DirectoryLoading } from "@/components/directory-state";
import { JobCard } from "@/components/job-card";
import { useLocale, useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { saveJobSearch } from "@/lib/job-alerts";
import { PROVINCES, filterJobs, type BudgetType, type Job } from "@/lib/data";
import { useMarketplace } from "@/lib/marketplace";
import { provinceLabel } from "@/lib/place";
import { useDirectoryStatus } from "@/lib/use-directory-status";
import { cn } from "cn";

type Filters = {
  search: string;
  province: string;
  remoteOnly: boolean;
  budgetMin: string;
  budgetMax: string;
  budgetType: "all" | BudgetType;
  skills: string[];
  sort: "newest" | "budget";
};

const initialFilters: Filters = {
  search: "",
  province: "all",
  remoteOnly: false,
  budgetMin: "",
  budgetMax: "",
  budgetType: "all",
  skills: [],
  sort: "newest",
};

function SaveSearch({
  idPrefix,
  filters,
  canSave,
}: {
  idPrefix: string;
  filters: Filters;
  canSave: boolean;
}) {
  const t = useT();
  if (!canSave) {
    return <p className="border-t pt-4 text-sm text-muted-foreground">{t("alerts.preview")}</p>;
  }
  return (
    <form action={saveJobSearch} className="grid gap-2 border-t pt-4">
      <input type="hidden" name="skills" value={filters.skills.join("\n")} />
      <input type="hidden" name="min_budget_cad" value={filters.budgetMin} />
      <input type="hidden" name="budget_type" value={filters.budgetType} />
      <input type="hidden" name="province" value={filters.province} />
      <input type="hidden" name="remote_only" value={filters.remoteOnly ? "1" : ""} />
      <Label htmlFor={`${idPrefix}-save-name`}>{t("alerts.name")}</Label>
      <Input
        id={`${idPrefix}-save-name`}
        name="name"
        required
        maxLength={80}
        placeholder={t("alerts.namePlaceholder")}
        className="h-10"
      />
      <Button type="submit" className="h-10">
        {t("alerts.save")}
      </Button>
    </form>
  );
}

export function JobBoard({
  jobsProp,
  canSave = false,
}: {
  jobsProp?: Job[];
  canSave?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const { status, retry } = useDirectoryStatus();
  const { jobs: contextJobs } = useMarketplace();
  const jobs = jobsProp ?? contextJobs;
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const results = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const skillOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      for (const skill of job.skills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([skill]) => skill);
    const selected = filters.skills.filter((skill) => !ranked.slice(0, 16).includes(skill));
    return [...selected, ...ranked.slice(0, 16)];
  }, [jobs, filters.skills]);

  const activeCount = [
    filters.province !== "all",
    filters.remoteOnly,
    filters.budgetMin.trim() !== "",
    filters.budgetMax.trim() !== "",
    filters.budgetType !== "all",
    filters.skills.length > 0,
  ].filter(Boolean).length;

  function update(partial: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...partial }));
  }

  function toggleSkill(skill: string) {
    update({
      skills: filters.skills.includes(skill)
        ? filters.skills.filter((item) => item !== skill)
        : [...filters.skills, skill],
    });
  }

  function clearFilters() {
    setFilters((current) => ({
      ...initialFilters,
      search: current.search,
      sort: current.sort,
    }));
  }

  const fields = (idPrefix: string) => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-province`}>{t("jobs.province")}</Label>
        <Select
          value={filters.province}
          onValueChange={(province) => update({ province })}
          disabled={filters.remoteOnly}
        >
          <SelectTrigger id={`${idPrefix}-province`} className="w-full">
            <SelectValue placeholder={t("jobs.anyProvince")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("jobs.anyProvince")}</SelectItem>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {provinceLabel(province, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.remoteOnly}
          onChange={(event) => update({ remoteOnly: event.target.checked })}
          className="size-4 accent-current"
        />
        {t("jobs.remoteOnly")}
      </label>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-type`}>{t("jobs.budgetType")}</Label>
        <Select
          value={filters.budgetType}
          onValueChange={(budgetType) =>
            update({ budgetType: budgetType as Filters["budgetType"] })
          }
        >
          <SelectTrigger id={`${idPrefix}-type`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("jobs.typeAny")}</SelectItem>
            <SelectItem value="fixed">{t("jobs.typeFixed")}</SelectItem>
            <SelectItem value="hourly">{t("jobs.typeHourly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`${idPrefix}-min`}>{t("jobs.min")}</Label>
          <Input
            id={`${idPrefix}-min`}
            inputMode="decimal"
            value={filters.budgetMin}
            onChange={(event) => update({ budgetMin: event.target.value })}
            placeholder="500"
            className="h-10"
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor={`${idPrefix}-max`}>{t("jobs.max")}</Label>
          <Input
            id={`${idPrefix}-max`}
            inputMode="decimal"
            value={filters.budgetMax}
            onChange={(event) => update({ budgetMax: event.target.value })}
            placeholder="3000"
            className="h-10"
          />
        </div>
      </div>
      {skillOptions.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{t("jobs.skills")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {skillOptions.map((skill) => {
              const selected = filters.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-left text-xs",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {activeCount > 0 ? (
        <Button type="button" variant="ghost" className="justify-start px-0" onClick={clearFilters}>
          {t("jobs.clear")}
        </Button>
      ) : null}
      <SaveSearch idPrefix={idPrefix} filters={filters} canSave={canSave} />
    </div>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-10">
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="font-heading text-xl">{t("jobs.filters")}</h2>
        <div className="mt-4">{fields("desk")}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid w-full min-w-0 gap-2 sm:max-w-md">
            <Label htmlFor="job-search">{t("jobs.search")}</Label>
            <Input
              id="job-search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder={t("jobs.searchPlaceholder")}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="job-sort">{t("jobs.sort")}</Label>
              <Select
                value={filters.sort}
                onValueChange={(sort) => update({ sort: sort as Filters["sort"] })}
              >
                <SelectTrigger id="job-sort" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("jobs.newest")}</SelectItem>
                  <SelectItem value="budget">{t("jobs.highestBudget")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 lg:hidden">
                  {t("jobs.filters")}
                  {activeCount > 0 ? ` (${activeCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>{t("jobs.filters")}</SheetTitle>
                  <SheetDescription>{t("jobs.filterHelp")}</SheetDescription>
                </SheetHeader>
                <div className="overflow-y-auto px-4 pb-4">{fields("sheet")}</div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button className="h-11">{t("jobs.show")}</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="mt-6" aria-busy={status === "loading"}>
          {status === "loading" ? <DirectoryLoading label={t("jobs.loading")} /> : null}
          {status === "error" ? (
            <DirectoryError
              title={t("jobs.errorTitle")}
              body={t("jobs.errorBody")}
              onRetry={retry}
            />
          ) : null}
          {status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {results.length === 1
                  ? t("jobs.countOne")
                  : t("jobs.count", { count: results.length })}
              </p>
              {results.length === 0 ? (
                jobs.length === 0 ? (
                  <DirectoryEmpty
                    title={t("jobs.emptyTitle")}
                    body={t("jobs.emptyBody")}
                    action={{ href: "/post", label: t("nav.post") }}
                  />
                ) : (
                  <DirectoryEmpty
                    title={t("jobs.noMatchTitle")}
                    body={t("jobs.noMatchBody")}
                    onClear={() => setFilters(initialFilters)}
                    action={{ href: "/post", label: t("nav.post") }}
                  />
                )
              ) : (
                <ul className="grid gap-3">
                  {results.map((job) => (
                    <li key={job.id}>
                      <JobCard job={job} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
