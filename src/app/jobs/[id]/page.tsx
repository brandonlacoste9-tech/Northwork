import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EscrowPanel } from "@/components/escrow-panel";
import { JobDetail } from "@/components/job-detail";
import { ReviewForm } from "@/components/review-form";
import {
  ProposalForm,
  ProposalList,
  ProposalPreview,
  ProposalSignIn,
} from "@/components/proposals";
import { isSupabaseConfigured, type ProfileRow, type ProposalRow } from "@/lib/backend";
import { getSeedJob } from "@/lib/data";
import { loadJob } from "@/lib/listings";
import { isStripeConfigured, stripePublishableKey } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("jobs")
      .select("title")
      .eq("id", id)
      .maybeSingle();
    if (!data) return { title: "Project" };
    return {
      title: (data as { title: string }).title,
      description: "A project on Northernwork.",
    };
  }
  const job = getSeedJob(id);
  if (!job) return { title: "Project" };
  return {
    title: job.title,
    description: `${job.client} · ${job.location} · a project on Northernwork.`,
  };
}

export default async function JobPage({ params }: PageProps) {
  const { id } = await params;

  // Zero-config preview: sample data via the marketplace provider.
  if (!isSupabaseConfigured()) {
    return (
      <main>
        <JobDetail id={id} showPitchLink>
          <ProposalPreview />
        </JobDetail>
      </main>
    );
  }

  const loaded = await loadJob(id);
  if (!loaded) notFound();
  const { row: jobRow, job } = loaded;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(user && user.id === jobRow.client_id);
  let hired = false;

  let proposalSlot: ReactNode = null;
  if (isOwner) {
    const { data: proposals } = await supabase
      .from("proposals")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false });
    const rows = (proposals ?? []) as ProposalRow[];
    const freelancerIds = [...new Set(rows.map((p) => p.freelancer_id))];
    const byId: Record<
      string,
      Pick<ProfileRow, "display_name" | "title" | "hourly_rate_cad">
    > = {};
    if (freelancerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, title, hourly_rate_cad")
        .in("id", freelancerIds);
      for (const p of (profiles ?? []) as (Pick<
        ProfileRow,
        "id" | "display_name" | "title" | "hourly_rate_cad"
      >)[]) {
        byId[p.id] = p;
      }
    }
    const enriched = rows.map((r) => ({
      ...r,
      freelancer_name: byId[r.freelancer_id]?.display_name ?? null,
      freelancer_title: byId[r.freelancer_id]?.title ?? null,
      freelancer_rate: byId[r.freelancer_id]?.hourly_rate_cad ?? null,
    }));
    proposalSlot = (
      <ProposalList jobId={id} jobStatus={jobRow.status} proposals={enriched} />
    );
  } else if (user) {
    const { data: mine } = await supabase
      .from("proposals")
      .select("status")
      .eq("job_id", id)
      .eq("freelancer_id", user.id)
      .maybeSingle();
    const { data: thread } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", id)
      .eq("freelancer_id", user.id)
      .maybeSingle();
    const threadLink = thread?.id ? (
      <p className="mt-4">
        <Link href={`/messages/${thread.id}`} className="font-medium text-primary hover:underline">
          Open your thread with the client
        </Link>
      </p>
    ) : null;
    if ((mine as { status: string } | null)?.status === "accepted") {
      hired = true;
      proposalSlot = (
        <section className="mt-10 border-t pt-8">
          <h2 className="font-heading text-2xl">You&apos;re hired</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The client accepted your pitch. Keep the work in your thread.
          </p>
          {threadLink}
        </section>
      );
    } else {
      proposalSlot = (
        <>
          {threadLink}
          <ProposalForm jobId={id} proposalCount={job.proposalCount ?? 0} />
        </>
      );
    }
  } else {
    proposalSlot = <ProposalSignIn proposalCount={job.proposalCount ?? 0} />;
  }

  let reviewSlot: ReactNode = null;
  if (user && jobRow.status === "closed") {
    const { data: accepted } = await supabase
      .from("proposals")
      .select("freelancer_id")
      .eq("job_id", id)
      .eq("status", "accepted")
      .maybeSingle();
    const hiredId = (accepted as { freelancer_id: string } | null)?.freelancer_id;
    const eligible = user.id === jobRow.client_id || user.id === hiredId;
    if (eligible) {
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("job_id", id)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      reviewSlot = existing ? (
        <p className="mt-8 text-sm text-muted-foreground">
          You already reviewed this project.
        </p>
      ) : (
        <ReviewForm jobId={id} />
      );
    }
  }

  let escrowSlot: ReactNode = null;
  if (user && jobRow.status === "in_progress") {
    const { data: accepted } = await supabase
      .from("proposals")
      .select("freelancer_id, bid_cad")
      .eq("job_id", id)
      .eq("status", "accepted")
      .maybeSingle();
    const hire = accepted as { freelancer_id: string; bid_cad: number | string | null } | null;
    if (hire && (user.id === jobRow.client_id || user.id === hire.freelancer_id)) {
      const { data: freelancer } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", hire.freelancer_id)
        .maybeSingle();
      const { data: payment } = await supabase
        .from("payments")
        .select("status, amount_cad")
        .eq("job_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const paymentRow = payment as { status: "held" | "released" | "refunded"; amount_cad: number | string } | null;
      const amount = Number(hire.bid_cad ?? jobRow.budget_cad);
      escrowSlot = (
        <EscrowPanel
          jobId={id}
          role={user.id === jobRow.client_id ? "client" : "freelancer"}
          amountCad={Number.isFinite(amount) ? amount : null}
          status={paymentRow?.status ?? null}
          freelancerConnected={Boolean(
            (freelancer as { stripe_account_id: string | null } | null)?.stripe_account_id
          )}
          stripeReady={isStripeConfigured() && Boolean(stripePublishableKey())}
          publishableKey={stripePublishableKey()}
        />
      );
    }
  }

  return (
    <main>
      <JobDetail
        id={id}
        job={job}
        showPitchLink={!isOwner && !hired}
      >
        {proposalSlot}
        {escrowSlot}
        {reviewSlot}
      </JobDetail>
    </main>
  );
}
