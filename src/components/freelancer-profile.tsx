"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { Globe, MapPin } from "lucide-react";
import { DirectoryEmpty } from "@/components/directory-state";
import { InviteDialog, type InviteJob } from "@/components/invite-dialog";
import { PersonAvatar } from "@/components/person-avatar";
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
import { startProfileConversation } from "@/lib/actions";
import type { Freelancer, PortfolioItem, ProfileLinks } from "@/lib/data";
import { availabilityLabel, formatHourly, memberSinceLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
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
              {person.pro && !person.sample ? <TrustBadge kind="pro" /> : null}
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
            <ProfileLinkRow links={person.links} />
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
            <div className="flex w-full flex-col gap-2 sm:w-56">
              <ContactButton
                freelancerId={person.id}
                signedIn={Boolean(invite?.signedIn)}
              />
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
  const pieces: PortfolioItem[] =
    person.portfolio && person.portfolio.length > 0
      ? person.portfolio
      : person.sample
        ? person.sampleWork.map((work) => ({
            id: work.title,
            title: work.title,
            summary: work.summary,
            imageUrl: null,
            images: [],
            url: null,
          }))
        : [];
  if (pieces.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl">{t("profile.work")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {pieces.map((work) => {
          const images = work.images?.length ? work.images : work.imageUrl ? [work.imageUrl] : [];
          return (
            <li key={work.id}>
              <Card className="h-full overflow-hidden">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[0]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[4/3] bg-muted" />
                )}
                <CardHeader>
                  <CardTitle className="text-base">{work.title}</CardTitle>
                  {work.summary ? <CardDescription>{work.summary}</CardDescription> : null}
                </CardHeader>
                {images.length > 1 || work.url ? (
                  <CardContent className="grid gap-3">
                    {images.length > 1 ? (
                      <ul className="grid grid-cols-4 gap-1.5">
                        {images.slice(1, 5).map((src) => (
                          <li key={src}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="aspect-square w-full rounded-md object-cover"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {work.url ? (
                      <a
                        href={work.url}
                        className="text-sm font-medium text-primary hover:underline"
                        rel="noreferrer"
                        target="_blank"
                      >
                        {t("profile.viewProject")}
                      </a>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BrandIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function BehanceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.2 11.3c.8-.4 1.3-1 1.3-1.9 0-1.6-1.2-2.6-3.3-2.6H2v11.4h4.5c2.3 0 3.7-1.2 3.7-3.1 0-1.5-.8-2.5-2-2.8ZM4.4 8.3h1.7c.9 0 1.4.4 1.4 1.1s-.5 1.2-1.5 1.2H4.4V8.3Zm1.9 7.4H4.4v-2.6h2c1 0 1.6.5 1.6 1.3s-.6 1.3-1.7 1.3ZM14.2 7.2c-2.6 0-4.4 1.9-4.4 5.3 0 3.3 1.8 5.3 4.5 5.3 2 0 3.4-.9 4.1-2.5h-2.1c-.4.6-1 .9-1.9.9-1.2 0-2-.8-2.1-2.2h6.3c.1-.4.1-.8.1-1.2 0-3.1-1.6-5.6-4.5-5.6Zm-2 4.4c.2-1.2 1-2 2.1-2 1.1 0 1.8.8 1.9 2H12.2ZM21.2 8.4h-5.4V6.8h5.4v1.6Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <BrandIcon>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </BrandIcon>
  );
}

function LinkedinIcon() {
  return (
    <BrandIcon>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </BrandIcon>
  );
}

function InstagramIcon() {
  return (
    <BrandIcon>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </BrandIcon>
  );
}

function ProfileLinkRow({ links }: { links?: ProfileLinks }) {
  const t = useT();
  const items: { href: string; label: MessageKey; icon: ReactNode }[] = [];
  if (links?.website) items.push({ href: links.website, label: "profile.website", icon: <Globe className="size-4" /> });
  if (links?.behance) items.push({ href: links.behance, label: "profile.behance", icon: <BehanceIcon /> });
  if (links?.github) items.push({ href: links.github, label: "profile.github", icon: <GithubIcon /> });
  if (links?.linkedin) items.push({ href: links.linkedin, label: "profile.linkedin", icon: <LinkedinIcon /> });
  if (links?.instagram) items.push({ href: links.instagram, label: "profile.instagram", icon: <InstagramIcon /> });
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            aria-label={t(item.label)}
            className="inline-flex size-9 items-center justify-center rounded-full border hover:bg-muted"
          >
            {item.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ContactButton({
  freelancerId,
  signedIn,
}: {
  freelancerId: string;
  signedIn: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(startProfileConversation, null);
  if (!signedIn) {
    return (
      <Button asChild variant="outline" className="h-10 w-full">
        <Link href={`/signup?next=/talent/${freelancerId}`}>{t("profile.createAccount")}</Link>
      </Button>
    );
  }
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="freelancer_id" value={freelancerId} />
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {t("profile.contact")}
      </Button>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
