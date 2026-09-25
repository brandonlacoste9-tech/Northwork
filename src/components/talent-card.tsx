"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
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
import { availabilityLabel, formatHourly } from "@/lib/format";
import { formatPersonPlace } from "@/lib/place";
import { StarRow } from "@/components/review-form";

export function TalentCard({ person }: { person: Freelancer }) {
  const t = useT();
  const locale = useLocale();
  const place = formatPersonPlace(person.city, person.province, locale);
  const shownSkills = person.skills.slice(0, 4);
  const extraSkills = person.skills.length - shownSkills.length;
  return (
    <Link href={`/talent/${person.id}`} className="block h-full rounded-xl">
      <Card className="h-full transition-shadow hover:ring-primary/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <PersonAvatar name={person.name} src={person.avatarUrl} />
            <div className="min-w-0">
              <CardTitle className="line-clamp-2">{person.name}</CardTitle>
              {person.role ? (
                <CardDescription className="line-clamp-2">{person.role}</CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {place ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{place}</span>
            </p>
          ) : null}
          {person.reviewCount ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <StarRow rating={person.rating ?? 0} />
              <span className="text-muted-foreground">
                {(person.rating ?? 0).toFixed(1)} ·{" "}
                {person.reviewCount === 1
                  ? t("profile.reviewOne", { count: person.reviewCount })
                  : t("profile.reviewsMany", { count: person.reviewCount })}
              </span>
            </p>
          ) : null}
          {shownSkills.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {shownSkills.map((skill) => (
                <li key={skill}>
                  <Badge variant="outline">{skill}</Badge>
                </li>
              ))}
              {extraSkills > 0 ? (
                <li>
                  <Badge variant="outline">+{extraSkills}</Badge>
                </li>
              ) : null}
            </ul>
          ) : null}
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            {person.hourlyRate > 0 ? (
              <p className="font-heading text-lg tabular-nums">
                {formatHourly(person.hourlyRate, locale)}
              </p>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {person.verified ? <TrustBadge kind="verified" /> : null}
              {person.availability ? (
                <Badge variant="outline" className="max-w-40 truncate">
                  {availabilityLabel(person.availability, locale)}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
