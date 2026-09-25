import Link from "next/link";
import { MapPin } from "lucide-react";
import { InviteDialog } from "@/components/invite-dialog";
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

export function FreelancerProfile({ person }: { person: Freelancer }) {
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
          <PersonAvatar name={person.name} className="size-16 text-lg" />
          <div>
            <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
              {person.name}
            </h1>
            <p className="mt-1 text-lg">{person.role}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              {person.city}, {person.province}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="font-heading text-3xl">{formatHourly(person.hourlyRate)}</p>
          <p className="text-sm text-muted-foreground">{person.availability}</p>
          <InviteDialog freelancerName={person.name} />
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
      {person.sampleWork.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl">Sample work</h2>
          <div className="mt-4 grid gap-3">
            {person.sampleWork.map((work) => (
              <Card key={work.title}>
                <CardHeader>
                  <CardTitle>{work.title}</CardTitle>
                  <CardDescription>{work.summary}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {person.city}, {person.province}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
