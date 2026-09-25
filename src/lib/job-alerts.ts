import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SITE = "https://northernwork.ca";

type InstantRow = {
  recipient: string;
  search_id: string;
  token: string;
  search_name: string;
};

type DigestRow = {
  recipient: string;
  token: string;
  search_name: string;
  job_id: string;
  job_title: string;
  job_budget: number | string | null;
  job_budget_type: string | null;
  job_location: string | null;
};

function budgetLine(amount: number | string | null, type: string | null) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "CAD";
  const money = `$${Math.round(n).toLocaleString("en-CA")} CAD`;
  return type === "hourly" ? `${money}/hr` : money;
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM;
  if (!key || !from || !to.includes("@")) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
}

async function emailFor(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

function unsubscribeLine(token: string, name: string) {
  return `Unsubscribe from “${name}” / Se désabonner de « ${name} »: ${SITE}/alerts/unsubscribe?token=${token}`;
}

/** In-app alert as soon as a matching project is posted. Email when Resend is set. */
export async function dispatchInstantJobAlerts(jobId: string) {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("dispatch_saved_search_alerts", { target_job: jobId });
    if (error || !data) return;
    const rows = data as InstantRow[];
    const { data: job } = await admin
      .from("jobs")
      .select("title, budget_cad, budget_type, location")
      .eq("id", jobId)
      .maybeSingle();
    const title = (job as { title?: string } | null)?.title ?? "Project";
    const budget = budgetLine(
      (job as { budget_cad?: number | string | null } | null)?.budget_cad ?? null,
      (job as { budget_type?: string | null } | null)?.budget_type ?? null,
    );
    const place = (job as { location?: string | null } | null)?.location ?? "Canada";
    const byUser = new Map<string, InstantRow[]>();
    for (const row of rows) {
      const list = byUser.get(row.recipient) ?? [];
      list.push(row);
      byUser.set(row.recipient, list);
    }
    for (const [userId, matches] of byUser) {
      const to = await emailFor(admin, userId);
      if (!to) continue;
      const link = `${SITE}/jobs/${jobId}`;
      const text = [
        `New project on Northernwork / Nouveau projet sur Northernwork`,
        ``,
        title,
        `${budget} · ${place}`,
        link,
        ``,
        ...matches.map((match) => unsubscribeLine(match.token, match.search_name)),
        `Manage alerts / Gérer les alertes: ${SITE}/settings/alerts`,
      ].join("\n");
      await sendEmail(to, `Northernwork: ${title}`, text);
    }
    return;
  }

  const supabase = await createClient();
  await supabase.rpc("dispatch_saved_search_alerts", { target_job: jobId });
}

/** Group the last day of daily matches into one email per person. */
export async function dispatchDailyJobAlerts() {
  const admin = createAdminClient();
  if (!admin) return { users: 0 };
  const { data, error } = await admin.rpc("dispatch_daily_job_alerts");
  if (error || !data) return { users: 0 };
  const rows = data as DigestRow[];
  const byUser = new Map<string, DigestRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.recipient) ?? [];
    list.push(row);
    byUser.set(row.recipient, list);
  }
  for (const [userId, matches] of byUser) {
    const to = await emailFor(admin, userId);
    if (!to) continue;
    const jobs = new Map<string, DigestRow>();
    const searches = new Map<string, DigestRow>();
    for (const match of matches) {
      jobs.set(match.job_id, match);
      searches.set(match.token, match);
    }
    const lines = [...jobs.values()].map((job) => {
      return `- ${job.job_title} — ${budgetLine(job.job_budget, job.job_budget_type)} — ${job.job_location ?? "Canada"}\n  ${SITE}/jobs/${job.job_id}`;
    });
    const text = [
      `${jobs.size} new project${jobs.size === 1 ? "" : "s"} match your Northernwork searches.`,
      `${jobs.size} nouveau${jobs.size === 1 ? "" : "x"} projet${jobs.size === 1 ? "" : "s"} correspondent à vos recherches.`,
      ``,
      ...lines,
      ``,
      ...[...searches.values()].map((search) => unsubscribeLine(search.token, search.search_name)),
      `Manage alerts / Gérer les alertes: ${SITE}/settings/alerts`,
    ].join("\n");
    await sendEmail(
      to,
      jobs.size === 1 ? "1 new Northernwork project" : `${jobs.size} new Northernwork projects`,
      text,
    );
  }
  return { users: byUser.size };
}
