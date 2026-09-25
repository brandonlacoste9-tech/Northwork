"use client";

import { useMemo, useState } from "react";
import { DirectoryEmpty, DirectoryError, DirectoryLoading } from "@/components/directory-state";
import { JobCard } from "@/components/job-card";
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
import {
  PROVINCES,
  SKILLS,
  filterJobs,
  type BudgetType,
  type Job,
} from "@/lib/data";
import { useMarketplace } from "@/lib/marketplace";
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

export function JobBoard({ jobsProp }: { jobsProp?: Job[] }) {
  const { status, retry } = useDirectoryStatus();
  const { jobs: contextJobs } = useMarketplace();
  const jobs = jobsProp ?? contextJobs;
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const results = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);

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
        <Label htmlFor={`${idPrefix}-province`}>Province</Label>
        <Select
          value={filters.province}
          onValueChange={(province) => update({ province })}
          disabled={filters.remoteOnly}
        >
          <SelectTrigger id={`${idPrefix}-province`} className="w-full">
            <SelectValue placeholder="Any province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any province</SelectItem>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
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
        Remote in Canada only
      </label>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-type`}>Budget type</Label>
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
            <SelectItem value="all">Fixed or hourly</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-min`}>Min CAD</Label>
          <Input
            id={`${idPrefix}-min`}
            inputMode="decimal"
            value={filters.budgetMin}
            onChange={(event) => update({ budgetMin: event.target.value })}
            placeholder="5000"
            className="h-10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-max`}>Max CAD</Label>
          <Input
            id={`${idPrefix}-max`}
            inputMode="decimal"
            value={filters.budgetMax}
            onChange={(event) => update({ budgetMax: event.target.value })}
            placeholder="20000"
            className="h-10"
          />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Skills</legend>
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map((skill) => {
            const selected = filters.skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
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
      {activeCount > 0 ? (
        <Button type="button" variant="ghost" className="justify-start px-0" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <h2 className="font-heading text-xl">Filters</h2>
        <div className="mt-4">{fields("desk")}</div>
      </aside>
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid w-full gap-2 sm:max-w-md">
            <Label htmlFor="job-search">Search by title or skill</Label>
            <Input
              id="job-search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder="Try portal, translation, iOS"
              className="h-10"
            />
          </div>
          <div className="flex gap-2">
            <div className="grid gap-2">
              <Label htmlFor="job-sort">Sort</Label>
              <Select
                value={filters.sort}
                onValueChange={(sort) => update({ sort: sort as Filters["sort"] })}
              >
                <SelectTrigger id="job-sort" className="h-10 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="budget">Budget, high to low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="mt-auto h-10 lg:hidden">
                  Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Budget in CAD, province, or remote inside Canada.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4">{fields("sheet")}</div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button className="h-10">Show projects</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="mt-6" aria-busy={status === "loading"}>
          {status === "loading" ? <DirectoryLoading label="Loading open projects…" /> : null}
          {status === "error" ? (
            <DirectoryError
              title="The job board didn't load"
              body="Nothing was changed. Retry to load open projects from Canadian clients."
              onRetry={retry}
            />
          ) : null}
          {status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {results.length === 1 ? "1 open project" : `${results.length} open projects`}
              </p>
              {results.length === 0 ? (
                jobs.length === 0 ? (
                  <DirectoryEmpty
                    title="No open projects yet"
                    body="Canadian clients post briefs here, with a budget in CAD and a province or remote inside Canada."
                    action={{ href: "/post", label: "Post a project" }}
                  />
                ) : (
                  <DirectoryEmpty
                    title="No projects match"
                    body="Try another province, a wider CAD range, or remote inside Canada."
                    onClear={() => setFilters(initialFilters)}
                    action={{ href: "/post", label: "Post a project" }}
                  />
                )
              ) : (
                <ul className="grid gap-4">
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
