import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { JobDetail } from "@/components/job-detail";
import {
  ProposalForm,
  ProposalList,
  ProposalSignIn,
} from "@/components/proposals";
import {
  isSupabaseConfigured,
  mapJobRowToJob,
  type JobRow,
  type ProfileRow,
  type ProposalRow,
} from "@/lib/backend";
import { getSeedJob } from "@/lib/data";
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
        <JobDetail id={id} />
      </main>
    );
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();
  const jobRow = row as JobRow;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(user && user.id === jobRow.client_id);

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
    const { data: thread } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", id)
      .eq("freelancer_id", user.id)
      .maybeSingle();
    proposalSlot = (
      <>
        {thread?.id ? (
          <p className="mt-8">
            <Link href={`/messages/${thread.id}`} className="font-medium text-primary hover:underline">
              Open your thread with the client
            </Link>
          </p>
        ) : null}
        <ProposalForm jobId={id} />
      </>
    );
  } else {
    proposalSlot = <ProposalSignIn />;
  }

  return (
    <main>
      <JobDetail id={id} job={mapJobRowToJob(jobRow)}>
        {proposalSlot}
      </JobDetail>
    </main>
  );
}
