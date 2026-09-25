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

export function TalentCard({ person }: { person: Freelancer }) {
  const t = useT();
  const locale = useLocale();
  const place = formatPersonPlace(person.city, person.province, locale);
  const shownSkills = person.skills.slice(0, 2);
  return (
    <Link href={`/talent/${person.id}`} className="block h-full rounded-xl">
      <Card className="h-full transition-shadow hover:ring-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PersonAvatar name={person.name} src={person.avatarUrl} className="size-12" />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                <span className="min-w-0 truncate">{person.name}</span>
                {person.pro && !person.sample ? <TrustBadge kind="pro" /> : null}
              </CardTitle>
              <CardDescription className="truncate">
                {person.role || "\u00a0"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <p className="flex h-5 items-center gap-1.5 text-sm text-muted-foreground">
            {place ? (
              <>
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <ul className="flex h-6 gap-1.5 overflow-hidden">
            {shownSkills.map((skill) => (
              <li key={skill} className="min-w-0 max-w-[50%]">
                <Badge variant="outline" className="max-w-full truncate">
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex h-8 items-center justify-between gap-2">
            <p className="shrink-0 font-heading text-lg tabular-nums">
              {person.hourlyRate > 0 ? formatHourly(person.hourlyRate, locale) : "\u00a0"}
            </p>
            <div className="flex min-w-0 items-center justify-end gap-1.5">
              {person.verified ? <TrustBadge kind="verified" /> : null}
              {person.availability ? (
                <Badge variant="outline" className="max-w-28 truncate">
                  {availabilityLabel(person.availability, locale)}
                </Badge>
              ) : null}
              {person.reviewCount ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {(person.rating ?? 0).toFixed(1)}
                  <span className="sr-only">
                    {" "}
                    {person.reviewCount === 1
                      ? t("profile.reviewOne", { count: person.reviewCount })
                      : t("profile.reviewsMany", { count: person.reviewCount })}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
