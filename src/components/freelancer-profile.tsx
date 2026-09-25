"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { DirectoryEmpty } from "@/components/directory-state";
import { InviteDialog, type InviteJob } from "@/components/invite-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import { TrustBadge } from "@/components/trust-badge";
import { useLocale, useT } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Freelancer } from "@/lib/data";
import { availabilityLabel, formatHourly, memberSinceLabel } from "@/lib/format";
import { formatPersonPlace } from "@/lib/place";
import { StarRow } from "@/components/review-form";

export type ProfileReview = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export function FreelancerProfile({
  person,
  reviews,
  invite,
}: {
  person: Freelancer;
  reviews?: ProfileReview[];
  invite?: {
    configured: boolean;
    signedIn: boolean;
    self: boolean;
    jobs: InviteJob[];
  };
}) {
  const t = useT();
  const locale = useLocale();
  const place = formatPersonPlace(person.city, person.province, locale);
  const since = memberSinceLabel(person.memberSince, locale);
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link
        href="/talent"
        className="text-sm font-medium text-primary hover:underline"
      >
        {t("talent.back")}
      </Link>
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <PersonAvatar
            name={person.name}
            src={person.avatarUrl}
            className="size-16 text-lg"
          />
          <div className="min-w-0">
            <h1 className="font-heading text-3xl tracking-tight text-balance sm:text-4xl">
              {person.name}
            </h1>
            {person.role ? <p className="mt-1 text-lg">{person.role}</p> : null}
            {place ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {place}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {person.verified ? <TrustBadge kind="verified" /> : null}
              {person.availability ? (
                <Badge variant="outline">{availabilityLabel(person.availability, locale)}</Badge>
              ) : null}
              {person.completedCount ? (
                <Badge variant="outline">
                  {t("profile.completed", { count: person.completedCount })}
                </Badge>
              ) : null}
              {(person.reviewCount ?? 0) >= 2 && (person.rating ?? 0) >= 4.5 ? (
                <Badge variant="outline">{t("profile.highlyRated")}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
          {person.hourlyRate > 0 ? (
            <p className="font-heading text-3xl tabular-nums">
              {formatHourly(person.hourlyRate, locale)}
            </p>
          ) : null}
          {person.reviewCount ? (
            <p className="flex items-center gap-2 text-sm">
              <StarRow rating={person.rating ?? 0} />
              <span className="text-muted-foreground">
                {(person.rating ?? 0).toFixed(1)}
              </span>
            </p>
          ) : null}
          {since ? (
            <p className="text-sm text-muted-foreground">{since}</p>
          ) : null}
          {person.sample || invite?.self ? null : (
            <div className="w-full sm:w-auto">
              <InviteDialog
                freelancerId={person.id}
                freelancerName={person.name}
                configured={invite?.configured ?? false}
                signedIn={invite?.signedIn ?? false}
                jobs={invite?.jobs ?? []}
              />
            </div>
          )}
        </div>
      </header>
      {person.bio ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">{t("profile.about")}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/90">
            {person.bio}
          </p>
        </section>
      ) : null}
      {person.skills.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">{t("profile.skills")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {person.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="secondary">{skill}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <WorkSection person={person} />
      {reviews ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">{t("profile.reviews")}</h2>
          {reviews.length === 0 ? (
            <div className="mt-4">
              <DirectoryEmpty
                title={t("profile.noReviews")}
                body={t("profile.noReviewsBody")}
                action={{ href: "/jobs", label: t("profile.browseJobs") }}
              />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                {(
                  reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                ).toFixed(1)}{" "}
                ·{" "}
                {reviews.length === 1
                  ? t("profile.reviewOne", { count: reviews.length })
                  : t("profile.reviewsMany", { count: reviews.length })}
              </p>
              <ul className="mt-4 grid gap-3">
                {reviews.map((review) => (
                  <li key={review.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          {review.reviewerName}
                          <StarRow rating={review.rating} />
                        </CardTitle>
                        <CardDescription>
                          {new Date(review.createdAt).toLocaleDateString(
                            locale === "fr" ? "fr-CA" : "en-CA",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </CardDescription>
                      </CardHeader>
                      {review.comment ? (
                        <CardContent className="pt-0 text-sm leading-6">
                          {review.comment}
                        </CardContent>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}
    </article>
  );
}

function WorkSection({ person }: { person: Freelancer }) {
  const t = useT();
  const pieces =
    person.portfolio && person.portfolio.length > 0
      ? person.portfolio
      : person.sampleWork.map((work) => ({
          id: work.title,
          title: work.title,
          summary: work.summary,
          imageUrl: null as string | null,
          url: null as string | null,
        }));
  if (pieces.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl">{t("profile.work")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {pieces.map((work) => (
          <li key={work.id}>
            <Card className="h-full overflow-hidden">
              {work.imageUrl ? (
                // User-uploaded project images are public Supabase URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={work.imageUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] bg-muted" />
              )}
              <CardHeader>
                <CardTitle className="text-base">
                  {work.url ? (
                    <a href={work.url} className="hover:underline" rel="noreferrer" target="_blank">
                      {work.title}
                    </a>
                  ) : (
                    work.title
                  )}
                </CardTitle>
                {"summary" in work && work.summary ? (
                  <CardDescription>{work.summary}</CardDescription>
                ) : null}
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
