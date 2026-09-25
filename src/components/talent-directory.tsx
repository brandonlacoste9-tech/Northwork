"use client";

import { useMemo, useState } from "react";
import { DirectoryEmpty, DirectoryError, DirectoryLoading } from "@/components/directory-state";
import { TalentCard } from "@/components/talent-card";
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
import { PROVINCES, RATE_BANDS, filterFreelancers, freelancers, type Freelancer } from "@/lib/data";
import type { MessageKey } from "@/lib/i18n";
import { provinceLabel } from "@/lib/place";
import { useDirectoryStatus } from "@/lib/use-directory-status";

type Filters = {
  search: string;
  province: string;
  skill: string;
  rate: string;
};

const initialFilters: Filters = {
  search: "",
  province: "all",
  skill: "all",
  rate: "any",
};

const rateKey: Record<(typeof RATE_BANDS)[number]["id"], MessageKey> = {
  any: "talent.rateAny",
  "under-100": "talent.rateUnder",
  "100-140": "talent.rateMid",
  "140-170": "talent.rateHigh",
  "170-plus": "talent.rateTop",
};

export function TalentDirectory({ people }: { people?: Freelancer[] }) {
  const t = useT();
  const locale = useLocale();
  const { status, retry } = useDirectoryStatus();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const directory = people ?? freelancers;
  const results = useMemo(
    () => filterFreelancers(directory, filters),
    [directory, filters],
  );
  const skills = useMemo(() => {
    const names = new Set<string>();
    for (const person of directory) {
      for (const skill of person.skills) names.add(skill);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [directory]);

  const activeCount = [
    filters.province !== "all",
    filters.skill !== "all",
    filters.rate !== "any",
  ].filter(Boolean).length;

  function update(partial: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...partial }));
  }

  const fields = (idPrefix: string) => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-province`}>{t("talent.province")}</Label>
        <Select value={filters.province} onValueChange={(province) => update({ province })}>
          <SelectTrigger id={`${idPrefix}-province`} className="w-full">
            <SelectValue placeholder={t("talent.allProvinces")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("talent.allProvinces")}</SelectItem>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {provinceLabel(province, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-skill`}>{t("talent.skill")}</Label>
        <Select value={filters.skill} onValueChange={(skill) => update({ skill })}>
          <SelectTrigger id={`${idPrefix}-skill`} className="w-full">
            <SelectValue placeholder={t("talent.allSkills")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("talent.allSkills")}</SelectItem>
            {skills.map((skill) => (
              <SelectItem key={skill} value={skill}>
                {skill}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-rate`}>{t("talent.rate")}</Label>
        <Select value={filters.rate} onValueChange={(rate) => update({ rate })}>
          <SelectTrigger id={`${idPrefix}-rate`} className="w-full">
            <SelectValue placeholder={t("talent.rateAny")} />
          </SelectTrigger>
          <SelectContent>
            {RATE_BANDS.map((band) => (
              <SelectItem key={band.id} value={band.id}>
                {t(rateKey[band.id])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto justify-start px-0 text-left whitespace-normal"
          onClick={() => update({ province: "all", skill: "all", rate: "any" })}
        >
          {t("talent.clear")}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-10">
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="font-heading text-xl">{t("talent.filters")}</h2>
        <div className="mt-4">{fields("desk")}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid w-full min-w-0 gap-2 sm:max-w-md">
            <Label htmlFor="talent-search">{t("talent.search")}</Label>
            <Input
              id="talent-search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder={t("talent.searchPlaceholder")}
              className="h-11"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 lg:hidden">
                {t("talent.filters")}
                {activeCount > 0 ? ` (${activeCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{t("talent.filters")}</SheetTitle>
                <SheetDescription>{t("talent.filterHelp")}</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-4">{fields("sheet")}</div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button className="h-11">{t("talent.show")}</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div className="mt-6" aria-busy={status === "loading"}>
          {status === "loading" ? <DirectoryLoading label={t("talent.loading")} /> : null}
          {status === "error" ? (
            <DirectoryError
              title={t("talent.errorTitle")}
              body={t("talent.errorBody")}
              onRetry={retry}
            />
          ) : null}
          {status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {results.length === 1
                  ? t("talent.countOne")
                  : t("talent.count", { count: results.length })}
              </p>
              {results.length === 0 ? (
                directory.length === 0 ? (
                  <DirectoryEmpty
                    title={t("talent.emptyTitle")}
                    body={t("talent.emptyBody")}
                    action={{ href: "/profile", label: t("talent.publish") }}
                  />
                ) : (
                  <DirectoryEmpty
                    title={t("talent.noMatchTitle")}
                    body={t("talent.noMatchBody")}
                    onClear={() => setFilters(initialFilters)}
                  />
                )
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {results.map((person) => (
                    <li key={person.id} className="min-w-0">
                      <TalentCard person={person} />
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
