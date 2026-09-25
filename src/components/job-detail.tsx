"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBudget } from "@/lib/format";
import { useMarketplace } from "@/lib/marketplace";

export function JobDetail({ id }: { id: string }) {
  const { jobs } = useMarketplace();
  const job = jobs.find((item) => item.id === id);

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

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/jobs"
        className="text-sm font-medium text-primary hover:underline"
      >
        Back to jobs
      </Link>
      <header className="mt-6">
        <p className="text-sm text-muted-foreground">{job.client}</p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">
          {job.title}
        </h1>
        <p className="mt-4 font-heading text-3xl">
          {formatBudget(job.budgetMin, job.budgetMax)}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {job.location}
          <span aria-hidden="true">·</span>
          <span>Posted {job.postedLabel}</span>
          {job.postedLocally ? <Badge>On this device</Badge> : null}
        </p>
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
    </article>
  );
}
