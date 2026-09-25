import {
  isSupabaseConfigured,
  mapJobRowToJob,
  mapProfileToFreelancer,
  type JobRow,
  type ProfileRow,
} from "@/lib/backend";
import type { Freelancer, Job, PortfolioItem } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type ProposalCountRow = { job_id: string; proposal_count: number | string };
type PaidCountRow = { profile_id: string; paid_count: number | string };
type CompletedCountRow = { profile_id: string; completed_count: number | string };
type PortfolioRow = {
  id: string;
  freelancer_id: string;
  title: string;
  image_url: string | null;
  url: string | null;
};

function asCount(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function enrichJobs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: JobRow[],
): Promise<Job[]> {
  if (rows.length === 0) return [];
  const clientIds = [...new Set(rows.map((row) => row.client_id))];
  const [{ data: profiles }, { data: counts }, { data: openRows }, { data: paid }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, city, province, created_at, email_confirmed, is_sample")
      .in("id", clientIds),
    supabase.rpc("proposal_counts", { job_ids: rows.map((row) => row.id) }),
    supabase.from("jobs").select("client_id").eq("status", "open").in("client_id", clientIds),
    supabase.rpc("paid_project_counts", { profile_ids: clientIds }),
  ]);
  const profileById = new Map(
    (
      (profiles ?? []) as Pick<
        ProfileRow,
        | "id"
        | "display_name"
        | "city"
        | "province"
        | "created_at"
        | "email_confirmed"
        | "is_sample"
      >[]
    ).map((profile) => [profile.id, profile]),
  );
  const pitches = new Map(
    ((counts ?? []) as ProposalCountRow[]).map((row) => [
      row.job_id,
      asCount(row.proposal_count),
    ]),
  );
  const openByClient = new Map<string, number>();
  for (const row of (openRows ?? []) as { client_id: string }[]) {
    openByClient.set(row.client_id, (openByClient.get(row.client_id) ?? 0) + 1);
  }
  const paidById = new Map(
    ((paid ?? []) as PaidCountRow[]).map((row) => [row.profile_id, asCount(row.paid_count)]),
  );
  const jobs = rows.map((row) => {
    const profile = profileById.get(row.client_id);
    const sample = Boolean(profile?.is_sample);
    const paidCount = paidById.get(row.client_id) ?? 0;
    return mapJobRowToJob(row, {
      client: profile?.display_name?.trim() || "A Northernwork client",
      clientVerified: Boolean(profile?.email_confirmed) && paidCount > 0 && !sample,
      clientSample: sample,
      clientMemberSince: profile?.created_at ?? null,
      clientOpenJobs: openByClient.get(row.client_id) ?? 0,
      proposalCount: pitches.get(row.id) ?? 0,
    });
  });
  // Example listings stay visible alongside real ones; the UI badges them as examples.
  return jobs;
}

export async function loadOpenJobs(): Promise<Job[] | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  return enrichJobs(supabase, (data ?? []) as JobRow[]);
}

export async function loadJob(id: string): Promise<{ row: JobRow; job: Job } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as JobRow;
  const [job] = await enrichJobs(supabase, [row]);
  return { row, job };
}

async function annotateTalent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ProfileRow[],
  withPortfolio: boolean,
): Promise<Freelancer[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [{ data: reviews }, { data: completed }, { data: paid }, { data: pros }, portfolioResult] = await Promise.all([
    supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", ids),
    supabase.rpc("completed_project_counts", { profile_ids: ids }),
    supabase.rpc("paid_project_counts", { profile_ids: ids }),
    supabase.rpc("active_pro_ids", { profile_ids: ids }),
    withPortfolio
      ? supabase
          .from("portfolio_items")
          .select("id, freelancer_id, title, image_url, url")
          .in("freelancer_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as PortfolioRow[] }),
  ]);
  const ratings = new Map<string, number[]>();
  for (const review of (reviews ?? []) as { reviewee_id: string; rating: number }[]) {
    const list = ratings.get(review.reviewee_id) ?? [];
    list.push(review.rating);
    ratings.set(review.reviewee_id, list);
  }
  const completedById = new Map(
    ((completed ?? []) as CompletedCountRow[]).map((row) => [
      row.profile_id,
      asCount(row.completed_count),
    ]),
  );
  const paidById = new Map(
    ((paid ?? []) as PaidCountRow[]).map((row) => [row.profile_id, asCount(row.paid_count)]),
  );
  const proIds = new Set(
    ((pros ?? []) as { profile_id: string }[]).map((row) => row.profile_id),
  );
  const portfolioById = new Map<string, PortfolioItem[]>();
  for (const item of (portfolioResult.data ?? []) as PortfolioRow[]) {
    const list = portfolioById.get(item.freelancer_id) ?? [];
    list.push({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      url: item.url,
    });
    portfolioById.set(item.freelancer_id, list);
  }
  return rows.map((row) => {
    const scores = ratings.get(row.id) ?? [];
    const person = mapProfileToFreelancer(row);
    const average =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const sample = Boolean(row.is_sample);
    return {
      ...person,
      rating: average,
      reviewCount: scores.length,
      completedCount: completedById.get(row.id) ?? 0,
      memberSince: row.created_at,
      verified: Boolean(row.email_confirmed) && (paidById.get(row.id) ?? 0) > 0 && !sample,
      sample,
      pro: proIds.has(row.id) && !sample,
      portfolio: portfolioById.get(row.id) ?? [],
    };
  });
}

export async function loadTalentDirectory(): Promise<Freelancer[] | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const people = await annotateTalent(supabase, (data ?? []) as ProfileRow[], false);
  // Example profiles stay visible alongside real ones; the UI badges them as examples.
  // Pro profiles rank ahead of Free. Sample profiles are never Pro.
  return people.sort(
    (a, b) => Number(Boolean(b.pro) && !b.sample) - Number(Boolean(a.pro) && !a.sample),
  );
}

export async function loadTalent(id: string): Promise<Freelancer | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [person] = await annotateTalent(supabase, [data as ProfileRow], true);
  return person;
}
