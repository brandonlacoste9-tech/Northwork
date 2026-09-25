"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendAlertEmail } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

const SITE = "https://northernwork.ca";

function budgetLine(amount: number | string | null, type: string | null) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  const money = `$${Math.round(n).toLocaleString("en-CA")} CAD`;
  return type === "hourly" ? `${money}/hr` : money;
}

function footer(token: string, name: string) {
  return [
    `Unsubscribe from “${name}” / Se désabonner de « ${name} »: ${SITE}/alerts/unsubscribe?token=${token}`,
    `Manage alerts / Gérer les alertes: ${SITE}/settings/alerts`,
  ].join("\n");
}

async function emailFor(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** In-site alert as soon as a matching project is posted. Email when Resend is set. */
export async function dispatchInstantAlerts(jobId: string) {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("dispatch_saved_search_alerts", { target_job: jobId });
    if (error || !data) return;
    const rows = data as InstantRow[];
    const { data: job } = await admin
      .from("jobs")
      .select("title, budget_cad, budget_max_cad, budget_type, location")
      .eq("id", jobId)
      .maybeSingle();
    const title = (job as { title?: string } | null)?.title ?? "Project";
    const budget = budgetLine(
      (job as { budget_max_cad?: number | string | null; budget_cad?: number | string | null } | null)
        ?.budget_max_cad ??
        (job as { budget_cad?: number | string | null } | null)?.budget_cad ??
        null,
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
      const text = [
        "New project on Northernwork / Nouveau projet sur Northernwork",
        "",
        title,
        [budget, place].filter(Boolean).join(" · "),
        `${SITE}/jobs/${jobId}`,
        "",
        ...matches.map((match) => footer(match.token, match.search_name)),
      ].join("\n");
      await sendAlertEmail({ to, subject: `Northernwork: ${title}`, text });
    }
    return;
  }

  const supabase = await createClient();
  await supabase.rpc("dispatch_saved_search_alerts", { target_job: jobId });
}

/** One email per person for daily matches in the last 24 hours. */
export async function runDailyDigest() {
  const admin = createAdminClient();
  if (!admin) return { configured: false, users: 0 };
  const { data, error } = await admin.rpc("dispatch_daily_job_alerts");
  if (error || !data) return { configured: true, users: 0 };
  const rows = data as DigestRow[];
  const byUser = new Map<string, DigestRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.recipient) ?? [];
    list.push(row);
    byUser.set(row.recipient, list);
  }
  for (const [userId, matches] of byUser) {
    const to = await emailFor(admin, userId);
    const jobs = new Map<string, DigestRow>();
    const searches = new Map<string, DigestRow>();
    for (const match of matches) {
      jobs.set(match.job_id, match);
      searches.set(match.token, match);
    }
    const lines = [...jobs.values()].map((job) => {
      const budget = budgetLine(job.job_budget, job.job_budget_type);
      return `- ${job.job_title}${budget ? ` — ${budget}` : ""}${job.job_location ? ` — ${job.job_location}` : ""}\n  ${SITE}/jobs/${job.job_id}`;
    });
    const count = jobs.size;
    const text = [
      `${count} new project${count === 1 ? "" : "s"} match your Northernwork searches.`,
      `${count} nouveau${count === 1 ? "" : "x"} projet${count === 1 ? "" : "s"} correspondent à vos recherches.`,
      "",
      ...lines,
      "",
      ...[...searches.values()].map((search) => footer(search.token, search.search_name)),
    ].join("\n");
    await sendAlertEmail({
      to,
      subject: count === 1 ? "1 new Northernwork project" : `${count} new Northernwork projects`,
      text,
    });
  }
  return { configured: true, users: byUser.size };
}

export async function unsubscribeWithToken(token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return false;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unsubscribe_job_alert", { token });
  if (error) return false;
  return data === true;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs");
  return { supabase, user };
}

/** Save the current job-board filters for the signed-in freelancer. */
export async function saveJobSearch(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/jobs");
  const skills = String(formData.get("skills") ?? "")
    .split("\n")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 20);
  const minRaw = String(formData.get("min_budget_cad") ?? "").trim();
  const min = minRaw === "" ? null : Number(minRaw);
  const budgetType = String(formData.get("budget_type") ?? "");
  const province = String(formData.get("province") ?? "");
  const remote = formData.get("remote_only") === "1";
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name,
    skills,
    min_budget_cad: min !== null && Number.isFinite(min) && min >= 0 ? min : null,
    budget_type: budgetType === "fixed" || budgetType === "hourly" ? budgetType : null,
    province: remote || !province || province === "all" ? null : province,
    remote_only: remote,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
  redirect("/settings/alerts");
}

export async function setAlertFrequency(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const frequency = String(formData.get("frequency") ?? "");
  if (!["instant", "daily", "off"].includes(frequency)) redirect("/settings/alerts");
  const { error } = await supabase
    .from("saved_searches")
    .update({ alert_frequency: frequency })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
}

export async function deleteSavedSearch(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
}
