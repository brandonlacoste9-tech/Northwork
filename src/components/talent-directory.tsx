"use client";

import { useMemo, useState } from "react";
import { DirectoryEmpty, DirectoryError, DirectoryLoading } from "@/components/directory-state";
import { TalentCard } from "@/components/talent-card";
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
  RATE_BANDS,
  SKILLS,
  filterFreelancers,
  freelancers,
} from "@/lib/data";
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

export function TalentDirectory() {
  const { status, retry } = useDirectoryStatus();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const results = useMemo(
    () => filterFreelancers(freelancers, filters),
    [filters],
  );

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
        <Label htmlFor={`${idPrefix}-province`}>Province</Label>
        <Select
          value={filters.province}
          onValueChange={(province) => update({ province })}
        >
          <SelectTrigger id={`${idPrefix}-province`} className="w-full">
            <SelectValue placeholder="All provinces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All provinces</SelectItem>
            {PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-skill`}>Skill</Label>
        <Select value={filters.skill} onValueChange={(skill) => update({ skill })}>
          <SelectTrigger id={`${idPrefix}-skill`} className="w-full">
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {SKILLS.map((skill) => (
              <SelectItem key={skill} value={skill}>
                {skill}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-rate`}>Hourly rate</Label>
        <Select value={filters.rate} onValueChange={(rate) => update({ rate })}>
          <SelectTrigger id={`${idPrefix}-rate`} className="w-full">
            <SelectValue placeholder="Any rate" />
          </SelectTrigger>
          <SelectContent>
            {RATE_BANDS.map((band) => (
              <SelectItem key={band.id} value={band.id}>
                {band.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="justify-start px-0"
          onClick={() =>
            update({ province: "all", skill: "all", rate: "any" })
          }
        >
          Clear province, skill, and rate
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
            <Label htmlFor="talent-search">Search by name or skill</Label>
            <Input
              id="talent-search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder="Try Amélie, translation, iOS"
              className="h-10"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10 lg:hidden">
                Filters{activeCount > 0 ? ` (${activeCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Province, skill, and CAD hourly rate.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4">{fields("sheet")}</div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button className="h-10">Show results</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        <div className="mt-6" aria-busy={status === "loading"}>
          {status === "loading" ? (
            <DirectoryLoading label="Loading talent across Canada…" />
          ) : null}
          {status === "error" ? (
            <DirectoryError
              title="The talent directory didn't load"
              body="Nothing was changed. Retry to load freelancers working in Canada."
              onRetry={retry}
            />
          ) : null}
          {status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {results.length === 1
                  ? "1 freelancer"
                  : `${results.length} freelancers`}
              </p>
              {results.length === 0 ? (
                <DirectoryEmpty
                  title="No one matches those filters"
                  body="Try another province, skill, or rate. Northernwork only lists people working in Canada."
                  onClear={() => setFilters(initialFilters)}
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {results.map((person) => (
                    <li key={person.id}>
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
