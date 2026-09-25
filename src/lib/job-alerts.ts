"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { formatJobBudget } from "@/lib/format";
import { sendAlertEmail } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

type InstantRow = {
  user_id: string;
  email: string | null;
  title: string;
  budget_cad: number | string | null;
  budget_max_cad: number | string | null;
  budget_type: string | null;
  href: string;
  unsubscribe_token: string;
};

type DigestRow = InstantRow & { job_count: number };

const SITE = "https://northernwork.ca";

function money(row: { budget_cad: number | string | null; budget_max_cad: number | string | null; budget_type: string | null }) {
  const min = Number(row.budget_cad ?? row.budget_max_cad ?? 0);
  const max = Number(row.budget_max_cad ?? row.budget_cad ?? min);
  const type = row.budget_type === "hourly" ? "hourly" : "fixed";
  if (!Number.isFinite(min) || min <= 0) return "";
  return formatJobBudget(min, Number.isFinite(max) ? max : min, type, "en");
}

function footer(token: string) {
  const off = `${SITE}/alerts/unsubscribe?token=${token}`;
  const manage = `${SITE}/settings/alerts`;
  return [
    `Unsubscribe / Se désabonner: ${off}`,
    `Manage alerts / Gérer les alertes: ${manage}`,
  ].join("\n");
}

/** In-site alerts for instant saved searches, then email when Resend is set. */
export async function dispatchInstantAlerts(jobId: string) {
  if (!process.env.DATABASE_URL) return;
  const rows = await getDb()<InstantRow[]>`
    select * from private.dispatch_instant_alerts(${jobId}::uuid)
  `;
  for (const row of rows) {
    const budget = money(row);
    const link = `${SITE}${row.href}`;
    const lines = [
      row.title,
      budget,
      link,
      "",
      footer(row.unsubscribe_token),
    ].filter((line) => line !== "");
    await sendAlertEmail({
      to: row.email,
      subject: "Northernwork — new project / nouveau projet",
      text: lines.join("\n"),
    });
  }
}

/** Group the last 24 hours of daily matches into one note and one email per person. */
export async function runDailyDigest() {
  if (!process.env.DATABASE_URL) return { users: 0 };
  const rows = await getDb()<DigestRow[]>`
    select * from private.dispatch_daily_digests()
  `;
  const groups = new Map<string, DigestRow[]>();
  for (const row of rows) {
    const list = groups.get(row.user_id) ?? [];
    list.push(row);
    groups.set(row.user_id, list);
  }
  for (const list of groups.values()) {
    const count = Number(list[0]?.job_count ?? list.length);
    const lines = [
      `${count} new jobs match your saved searches.`,
      `${count} nouveaux projets correspondent à vos recherches.`,
      "",
      ...list.map((row) => {
        const budget = money(row);
        return [row.title, budget, `${SITE}${row.href}`].filter(Boolean).join("\n");
      }),
      "",
      footer(list[0].unsubscribe_token),
    ];
    await sendAlertEmail({
      to: list[0]?.email,
      subject: "Northernwork — job alerts / alertes de projets",
      text: lines.join("\n"),
    });
  }
  return { users: groups.size };
}

export async function unsubscribeWithToken(token: string) {
  if (!process.env.DATABASE_URL) return false;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;
  const rows = await getDb()<{ ok: boolean }[]>`
    select private.unsubscribe_alerts(${token}::uuid) as ok
  `;
  return Boolean(rows[0]?.ok);
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
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name,
    skills,
    min_budget_cad: min !== null && Number.isFinite(min) && min >= 0 ? min : null,
    budget_type: budgetType === "fixed" || budgetType === "hourly" ? budgetType : null,
    province: province && province !== "all" ? province : null,
    remote_only: formData.get("remote_only") === "1",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
  redirect("/settings/alerts");
}

export async function setAlertFrequency(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const frequency = String(formData.get("frequency") ?? "");
  if (!["instant", "daily", "off"].includes(frequency)) redirect("/settings/alerts");
  const { error } = await supabase
    .from("saved_searches")
    .update({ alert_frequency: frequency })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
}

export async function deleteSavedSearch(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
}
