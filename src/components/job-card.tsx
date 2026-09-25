import Link from "next/link";
import { MapPin } from "lucide-react";
import { TrustBadge } from "@/components/trust-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Job } from "@/lib/data";
import { formatBudget, postedAgo } from "@/lib/format";

function pitchLabel(count: number) {
  if (count === 1) return "1 pitch";
  return `${count} pitches`;
}

export function JobCard({ job }: { job: Job }) {
  const budgetType = job.budgetType ?? "fixed";
  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-xl">
      <Card className="transition-shadow hover:ring-primary/30">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {job.postedLocally ? <Badge>Just posted</Badge> : null}
            <Badge variant="outline">
              {job.location === "Remote in Canada" ? "Remote in Canada" : job.location}
            </Badge>
            <Badge variant="secondary">{budgetType === "hourly" ? "Hourly" : "Fixed"}</Badge>
            <CardDescription className="flex flex-wrap items-center gap-1.5">
              <span>{job.client}</span>
              {job.clientVerified ? <TrustBadge kind="verified" /> : null}
            </CardDescription>
          </div>
          <CardTitle className="text-lg">{job.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="font-heading text-xl">
            {formatBudget(job.budgetMin, job.budgetMax)}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden="true" />
            <span>{postedAgo(job.postedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{pitchLabel(job.proposalCount ?? 0)}</span>
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
