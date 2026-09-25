"use client";

import Link from "next/link";
import { TrustBadge } from "@/components/trust-badge";
import { useLocale, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Job } from "@/lib/data";
import { formatJobBudget, postedAgo } from "@/lib/format";
import { formatJobLocation } from "@/lib/place";

export function JobCard({ job }: { job: Job }) {
  const t = useT();
  const locale = useLocale();
  const budgetType = job.budgetType ?? "fixed";
  const pitches = job.proposalCount ?? 0;
  return (
    <Link href={`/jobs/${job.id}`} className="block h-full rounded-xl">
      <Card className="h-full transition-shadow hover:ring-primary/30">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.postedLocally ? <Badge>{t("jobs.justPosted")}</Badge> : null}
            <Badge variant="outline">{formatJobLocation(job.location, locale)}</Badge>
            <Badge variant="secondary">
              {budgetType === "hourly" ? t("jobs.typeHourly") : t("jobs.typeFixed")}
            </Badge>
            {job.clientVerified ? <TrustBadge kind="verified" /> : null}
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <CardTitle className="text-lg leading-snug">{job.title}</CardTitle>
            <p className="shrink-0 font-heading text-xl tabular-nums">
              {formatJobBudget(job.budgetMin, job.budgetMax, budgetType, locale)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">{job.client}</span>
            <span aria-hidden="true"> · </span>
            <span>{postedAgo(job.postedAt, locale)}</span>
            {pitches > 0 ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>
                  {pitches === 1 ? t("jobs.pitchOne") : t("jobs.pitches", { count: pitches })}
                </span>
              </>
            ) : null}
          </p>
          {job.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <li key={skill}>
                  <Badge variant="secondary">{skill}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
