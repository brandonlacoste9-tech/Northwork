import Link from "next/link";
import { MapPin } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Freelancer } from "@/lib/data";
import { formatHourly } from "@/lib/format";

export function TalentCard({ person }: { person: Freelancer }) {
  return (
    <Link href={`/talent/${person.id}`} className="block h-full rounded-xl">
      <Card className="h-full transition-shadow hover:ring-primary/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <PersonAvatar name={person.name} />
            <div className="min-w-0">
              <CardTitle>{person.name}</CardTitle>
              <CardDescription>{person.role}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            {person.city}, {person.province}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {person.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="outline">{skill}</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <p className="font-heading text-lg">{formatHourly(person.hourlyRate)}</p>
            <p className="text-right text-xs text-muted-foreground">
              {person.availability}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
