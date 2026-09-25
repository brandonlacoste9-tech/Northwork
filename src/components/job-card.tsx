import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Job } from "@/lib/data";
import { formatBudget } from "@/lib/format";

export function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-xl">
      <Card className="transition-shadow hover:ring-primary/30">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {job.postedLocally ? <Badge>Just posted</Badge> : null}
            <CardDescription>{job.client}</CardDescription>
          </div>
          <CardTitle className="text-lg">{job.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-heading text-xl">
            {formatBudget(job.budgetMin, job.budgetMax)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            {job.location}
            <span aria-hidden="true">·</span>
            <span>{job.postedLabel}</span>
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="secondary">{skill}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Link>
  );
}
