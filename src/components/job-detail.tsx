"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { TrustBadge } from "@/components/trust-badge";
import { useLocale, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJobBudget, memberSinceLabel, postedAgo } from "@/lib/format";
import { useMarketplace } from "@/lib/marketplace";
import { formatJobLocation } from "@/lib/place";
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
  const t = useT();
  const locale = useLocale();
  const { jobs } = useMarketplace();
  const job = jobProp ?? jobs.find((item) => item.id === id);

  if (!job) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-heading text-3xl">{t("jobs.missingTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("jobs.missingBody")}</p>
        <Button asChild className="mt-6 h-11 w-full px-4 sm:w-auto">
          <Link href="/jobs">{t("jobs.back")}</Link>
        </Button>
      </div>
    );
  }

  const since = memberSinceLabel(job.clientMemberSince, locale);
  const pitches = job.proposalCount ?? 0;
  const budgetType = job.budgetType ?? "fixed";

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">
        {t("jobs.back")}
      </Link>
      <header className="mt-6">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="text-foreground">{job.client}</span>
          {job.clientVerified ? <TrustBadge kind="verified" /> : null}
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight text-balance sm:text-4xl">
          {job.title}
        </h1>
        <div className="mt-4 flex flex-col gap-3 border-y py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="font-heading text-3xl tabular-nums">
            {formatJobBudget(job.budgetMin, job.budgetMax, budgetType, locale)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {budgetType === "hourly" ? t("jobs.typeHourly") : t("jobs.typeFixed")}
            </Badge>
            {job.duration ? <Badge variant="outline">{job.duration}</Badge> : null}
            <Badge variant="outline">
              <MapPin className="size-3" aria-hidden="true" />
              {formatJobLocation(job.location, locale)}
            </Badge>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("jobs.posted", { when: postedAgo(job.postedAt, locale) })}
          {pitches > 0 ? (
            <>
              <span aria-hidden="true"> · </span>
              {pitches === 1 ? t("jobs.pitchOne") : t("jobs.pitches", { count: pitches })}
            </>
          ) : null}
          {job.postedLocally ? <Badge className="ml-2">{t("jobs.onDevice")}</Badge> : null}
        </p>
        {showPitchLink ? (
          <Button asChild className="mt-5 h-12 w-full px-5 sm:w-auto">
            <a href="#pitch">{t("jobs.sendPitch")}</a>
          </Button>
        ) : null}
      </header>
      {job.skills.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <li key={skill}>
              <Badge variant="secondary">{skill}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 space-y-4 text-base leading-7">
        {job.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            {t("jobs.aboutClient")}
            {job.clientVerified ? <TrustBadge kind="verified" /> : null}
          </CardTitle>
          <CardDescription>{job.client}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted-foreground">
          {since ? <p>{since}</p> : null}
          <p>
            {(job.clientOpenJobs ?? 0) === 1
              ? t("jobs.clientOpenOne")
              : t("jobs.clientOpen", { count: job.clientOpenJobs ?? 0 })}
          </p>
          <p>{t("jobs.canadaNote")}</p>
        </CardContent>
      </Card>
      {children}
    </article>
  );
}
