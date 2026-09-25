"use client";

"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBudget, memberSinceLabel, postedAgo } from "@/lib/format";
import { useMarketplace } from "@/lib/marketplace";
import type { Job } from "@/lib/data";

export function JobDetail({
  id,
  job: jobProp,
  children,
  showPitchLink = false,
}: {
  id: string;
  /** Pre-fetched job (Supabase mode). Falls back to the marketplace context. */
  job?: Job;
  children?: React.ReactNode;
  showPitchLink?: boolean;
}) {
  const { jobs } = useMarketplace();
  const job = jobProp ?? jobs.find((item) => item.id === id);

  if (!job) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-3xl">This project is not listed</h1>
        <p className="mt-3 text-muted-foreground">
          It may have been cleared from this browser, or the link is wrong.
          Northernwork only keeps projects you post on this device.
        </p>
        <Button asChild className="mt-6 h-10 px-4">
          <Link href="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  const since = memberSinceLabel(job.clientMemberSince);
  const pitches = job.proposalCount ?? 0;
  const budgetType = job.budgetType ?? "fixed";

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
        Back to jobs
      </Link>
      <header className="mt-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{job.client}</span>
          {job.clientVerified ? <Badge variant="secondary">Verified</Badge> : null}
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">{job.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-y py-4">
          <p className="font-heading text-2xl">{formatBudget(job.budgetMin, job.budgetMax)}</p>
          <Badge variant="secondary">{budgetType === "hourly" ? "Hourly" : "Fixed"}</Badge>
          {job.duration ? <Badge variant="outline">{job.duration}</Badge> : null}
          <Badge variant="outline">
            <MapPin className="size-3" aria-hidden="true" />
            {job.location}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Posted {postedAgo(job.postedAt)}
          <span aria-hidden="true"> · </span>
          {pitches === 1 ? "1 pitch" : `${pitches} pitches`}
          {job.postedLocally ? <Badge className="ml-2">On this device</Badge> : null}
        </p>
        {showPitchLink ? (
          <Button asChild className="mt-5 h-11 px-5">
            <a href="#pitch">Send a pitch</a>
          </Button>
        ) : null}
      </header>
      <ul className="mt-6 flex flex-wrap gap-2">
        {job.skills.map((skill) => (
          <li key={skill}>
            <Badge variant="secondary">{skill}</Badge>
          </li>
        ))}
      </ul>
      <div className="mt-8 space-y-4 text-base leading-7">
        {job.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            About the client
            {job.clientVerified ? <Badge variant="secondary">Verified</Badge> : null}
          </CardTitle>
          <CardDescription>{job.client}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          {since ? <p>{since}</p> : null}
          <p>
            {job.clientOpenJobs === 1
              ? "1 open project"
              : `${job.clientOpenJobs ?? 0} open projects`}
          </p>
          <p>Work stays inside Canada. Budgets are in CAD.</p>
        </CardContent>
      </Card>
      {children}
    </article>
  );
}
