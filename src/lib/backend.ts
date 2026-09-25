import {
  REMOTE_IN_CANADA,
  type Availability,
  type Freelancer,
  type Job,
  type Province,
  type WorkLocation,
} from "@/lib/data";

/**
 * True when Supabase credentials are present. Reads NEXT_PUBLIC_* so it
 * works in Server Components, Client Components, and the proxy.
 * When false, the app runs the zero-config sample-data preview.
 */
/** Publishable key, with the legacy anon key accepted when that is all a project has. */
export function supabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && supabasePublishableKey()
  );
}

// ---------------------------------------------------------------------------
// Supabase row shapes (mirror supabase/schema.sql)
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  display_name: string | null;
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  hourly_rate_cad: number | string | null;
  avatar_url: string | null;
  languages: string[] | null;
  city: string | null;
  province: string | null;
  availability: string | null;
  stripe_account_id?: string | null;
  email_confirmed?: boolean | null;
  is_sample?: boolean | null;
  created_at: string;
};

export type JobRow = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget_cad: number | string | null;
  budget_max_cad?: number | string | null;
  budget_type: string | null;
  duration?: string | null;
  skills: string[] | null;
  location: string | null;
  status: string | null;
  created_at: string;
};

export type ProposalRow = {
  id: string;
  job_id: string;
  freelancer_id: string;
  cover_letter: string;
  bid_cad: number | string | null;
  status: string;
  created_at: string;
  freelancer_name?: string | null;
  freelancer_title?: string | null;
  freelancer_rate?: number | string | null;
};

// ---------------------------------------------------------------------------
// Mappers: Supabase rows -> preview UI types
// ---------------------------------------------------------------------------

export function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function toNumber(value: number | string | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function paragraphs(text: string): string[] {
  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

/** Map a Supabase profiles row to the talent-directory Freelancer shape. */
export function mapProfileToFreelancer(row: ProfileRow): Freelancer {
  return {
    id: row.id,
    name: row.display_name?.trim() || "Northernwork freelancer",
    role: row.title?.trim() || "Freelancer",
    city: row.city?.trim() || "",
    province: (row.province as Province) || "Ontario",
    skills: row.skills ?? [],
    hourlyRate: toNumber(row.hourly_rate_cad),
    availability: (row.availability as Availability) || "Available this week",
    bio: row.bio?.trim() || "",
    sampleWork: [],
    avatarUrl: row.avatar_url,
  };
}

/** A published Canadian profile: name, city, and province. */
export function profileIsPublished(row: {
  display_name: string | null;
  city: string | null;
  province: string | null;
}) {
  return Boolean(row.display_name?.trim() && row.city?.trim() && row.province?.trim());
}

/** Map a Supabase jobs row to the job-board Job shape. */
export function mapJobRowToJob(
  row: JobRow,
  extra?: Partial<
    Pick<
      Job,
      | "client"
      | "clientVerified"
      | "clientSample"
      | "clientMemberSince"
      | "clientOpenJobs"
      | "proposalCount"
    >
  >,
): Job {
  const budget = toNumber(row.budget_cad);
  const maxRaw =
    row.budget_max_cad == null || row.budget_max_cad === ""
      ? budget
      : toNumber(row.budget_max_cad);
  return {
    id: row.id,
    title: row.title,
    description: paragraphs(row.description),
    budgetMin: budget,
    budgetMax: Math.max(budget, maxRaw),
    budgetType: row.budget_type === "hourly" ? "hourly" : "fixed",
    duration: row.duration?.trim() || null,
    location: (row.location as WorkLocation) || REMOTE_IN_CANADA,
    skills: row.skills ?? [],
    postedAt: Date.parse(row.created_at) || Date.now(),
    postedLabel: timeAgo(row.created_at),
    client: extra?.client?.trim() || "A Northernwork client",
    clientVerified: extra?.clientVerified ?? false,
    clientSample: extra?.clientSample ?? false,
    clientMemberSince: extra?.clientMemberSince ?? null,
    clientOpenJobs: extra?.clientOpenJobs ?? 0,
    proposalCount: extra?.proposalCount ?? 0,
  };
}
