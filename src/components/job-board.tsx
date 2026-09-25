"use client";

import { useMemo, useState } from "react";
import { DirectoryEmpty, DirectoryError, DirectoryLoading } from "@/components/directory-state";
import { JobCard } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES, REMOTE_IN_CANADA, filterJobs, type Job } from "@/lib/data";
import { useMarketplace } from "@/lib/marketplace";
import { useDirectoryStatus } from "@/lib/use-directory-status";

export function JobBoard({ jobsProp }: { jobsProp?: Job[] }) {
  const { status, retry } = useDirectoryStatus();
  const { jobs: contextJobs } = useMarketplace();
  const jobs = jobsProp ?? contextJobs;
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");

  const results = useMemo(
    () => filterJobs(jobs, { search, location }),
    [jobs, search, location],
  );

  function clear() {
    setSearch("");
    setLocation("all");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="grid gap-4 sm:grid-cols-[1fr_16rem] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="job-search">Search by title or skill</Label>
          <Input
            id="job-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try portal, translation, iOS"
            className="h-10"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="job-location">Province or remote</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger id="job-location" className="w-full">
              <SelectValue placeholder="Anywhere in Canada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anywhere in Canada</SelectItem>
              <SelectItem value={REMOTE_IN_CANADA}>{REMOTE_IN_CANADA}</SelectItem>
              {PROVINCES.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <DirectoryLoading label="Loading open projects…" />
        ) : null}
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
              {results.length === 1
                ? "1 open project"
                : `${results.length} open projects`}
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
                  body="Try another province, or post the brief yourself. Northernwork only lists work inside Canada."
                  onClear={clear}
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
  );
}
