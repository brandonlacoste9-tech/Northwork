import Link from "next/link";
import { MapPin } from "lucide-react";
import { DirectoryEmpty } from "@/components/directory-state";
import { InviteDialog, type InviteJob } from "@/components/invite-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import { TrustBadge } from "@/components/trust-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Freelancer } from "@/lib/data";
import { formatHourly, memberSinceLabel } from "@/lib/format";
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
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/talent"
        className="text-sm font-medium text-primary hover:underline"
      >
        Back to talent
      </Link>
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <PersonAvatar
            name={person.name}
            src={person.avatarUrl}
            className="size-16 text-lg"
          />
          <div>
            <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
              {person.name}
            </h1>
            <p className="mt-1 text-lg">{person.role}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              {person.city}, {person.province}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {person.verified ? <TrustBadge kind="verified" /> : null}
              <Badge variant="outline">{person.availability}</Badge>
              {person.completedCount ? (
                <Badge variant="outline">
                  {person.completedCount} completed
                </Badge>
              ) : null}
              {(person.reviewCount ?? 0) >= 2 && (person.rating ?? 0) >= 4.5 ? (
                <Badge variant="outline">Highly rated</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="font-heading text-3xl">{formatHourly(person.hourlyRate)}</p>
          {person.reviewCount ? (
            <p className="flex items-center gap-2 text-sm">
              <StarRow rating={person.rating ?? 0} />
              <span className="text-muted-foreground">
                {(person.rating ?? 0).toFixed(1)}
              </span>
            </p>
          ) : null}
          {memberSinceLabel(person.memberSince) ? (
            <p className="text-sm text-muted-foreground">
              {memberSinceLabel(person.memberSince)}
            </p>
          ) : null}
          {person.sample || invite?.self ? null : (
            <InviteDialog
              freelancerId={person.id}
              freelancerName={person.name}
              configured={invite?.configured ?? false}
              signedIn={invite?.signedIn ?? false}
              jobs={invite?.jobs ?? []}
            />
          )}
        </div>
      </header>
      <section className="mt-10">
        <h2 className="font-heading text-2xl">About</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/90">
          {person.bio}
        </p>
      </section>
      <section className="mt-10">
        <h2 className="font-heading text-2xl">Skills</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {person.skills.map((skill) => (
            <li key={skill}>
              <Badge variant="secondary">{skill}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <WorkSection person={person} />
      {reviews ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="mt-4">
              <DirectoryEmpty
                title="No reviews yet"
                body="Reviews open after a project is closed, one from the client and one from the freelancer."
                action={{ href: "/jobs", label: "Browse open projects" }}
              />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                {(
                  reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                ).toFixed(1)}{" "}
                · {reviews.length} review{reviews.length === 1 ? "" : "s"}
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
                          {new Date(review.createdAt).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
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
      <h2 className="font-heading text-2xl">Work</h2>
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
