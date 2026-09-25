import Link from "next/link";
import { DirectoryEmpty } from "@/components/directory-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProposal,
  setJobStatus,
  setProposalStatus,
} from "@/lib/actions";
import { timeAgo, type ProposalRow } from "@/lib/backend";
import { formatCad } from "@/lib/format";

function bidLabel(bid: ProposalRow["bid_cad"]) {
  if (bid === null || bid === undefined || Number(bid) === 0)
    return "No bid set";
  return formatCad(Number(bid));
}

/** Cover-letter + bid form shown to signed-in freelancers on a job. */
export function ProposalForm({
  jobId,
  proposalCount = 0,
}: {
  jobId: string;
  proposalCount?: number;
}) {
  const action = createProposal.bind(null, jobId);
  return (
    <section id="pitch" className="mt-10 border-t pt-8">
      <h2 className="font-heading text-2xl">Send a pitch</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {proposalCount === 0
          ? "No pitches yet — be the first to pitch this project."
          : "Your pitch goes straight to the client. One pitch per project."}
      </p>
      <form action={action} className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="cover_letter">Cover letter</Label>
          <Textarea
            id="cover_letter"
            name="cover_letter"
            required
            rows={5}
            placeholder="Why you are the right person, and how you would approach the work."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bid_cad">Your bid (CAD)</Label>
          <Input
            id="bid_cad"
            name="bid_cad"
            inputMode="decimal"
            placeholder="12000"
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-11 w-full px-5 sm:w-fit">
          Send pitch
        </Button>
      </form>
    </section>
  );
}

/** Pitches + accept/decline + close/reopen, shown to the job owner. */
export function ProposalList({
  jobId,
  jobStatus,
  proposals,
}: {
  jobId: string;
  jobStatus: string | null;
  proposals: ProposalRow[];
}) {
  return (
    <section className="mt-10 border-t pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl">
          Pitches ({proposals.length})
        </h2>
        {jobStatus === "closed" ? (
          <form action={setJobStatus.bind(null, jobId, "open")}>
            <Button type="submit" variant="outline" className="h-10">
              Reopen project
            </Button>
          </form>
        ) : (
          <form action={setJobStatus.bind(null, jobId, "closed")}>
            <Button type="submit" variant="outline" className="h-10">
              Close project
            </Button>
          </form>
        )}
      </div>
      {proposals.length === 0 ? (
        <div className="mt-4">
          <DirectoryEmpty
            title="No pitches yet"
            body="No pitches yet — be the first to pitch this project. Invite someone from the talent directory."
            action={{ href: "/talent", label: "Browse talent" }}
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {proposal.freelancer_name || "Freelancer"}
                      {proposal.freelancer_title
                        ? ` · ${proposal.freelancer_title}`
                        : ""}
                    </CardTitle>
                    <Badge
                      variant={
                        proposal.status === "accepted"
                          ? "default"
                          : proposal.status === "declined"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {proposal.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Bid {bidLabel(proposal.bid_cad)} · pitched{" "}
                    {timeAgo(proposal.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-foreground/90">
                    {proposal.cover_letter}
                  </p>
                  {proposal.status === "pending" ? (
                    <div className="mt-4 flex gap-2">
                      <form
                        action={setProposalStatus.bind(
                          null,
                          jobId,
                          proposal.id,
                          "accepted"
                        )}
                      >
                        <Button type="submit" className="h-10">
                          Accept
                        </Button>
                      </form>
                      <form
                        action={setProposalStatus.bind(
                          null,
                          jobId,
                          proposal.id,
                          "declined"
                        )}
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          className="h-10"
                        >
                          Decline
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Sign-in nudge shown to visitors who are not logged in. */
export function ProposalSignIn({ proposalCount = 0 }: { proposalCount?: number }) {
  return (
    <section id="pitch" className="mt-10 border-t pt-8">
      <h2 className="font-heading text-2xl">Send a pitch</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {proposalCount === 0
          ? "No pitches yet — be the first to pitch this project. You need an account to send one."
          : "You need an account to pitch on this project."}
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="h-10">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link href="/signup">Create account</Link>
        </Button>
      </div>
    </section>
  );
}

/** Sample preview cannot store a pitch. */
export function ProposalPreview() {
  return (
    <section id="pitch" className="mt-10 border-t pt-8">
      <h2 className="font-heading text-2xl">Send a pitch</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No pitches yet — be the first to pitch this project. This sample preview does not save pitches.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="h-10">
          <Link href="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </section>
  );
}
