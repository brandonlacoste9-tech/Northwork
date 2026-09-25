"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseSkills(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseSkillsMulti(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseMoney(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Sign the current user out (used by the header sign-out button). */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

/** Create or update the current user's freelancer profile. */
export async function upsertProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: String(formData.get("display_name") ?? "").trim() || null,
      title: String(formData.get("title") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
      skills: parseSkills(formData.get("skills")),
      hourly_rate_cad: parseMoney(formData.get("hourly_rate_cad")),
      city: String(formData.get("city") ?? "").trim() || null,
      province: String(formData.get("province") ?? "").trim() || null,
      availability: String(formData.get("availability") ?? "").trim() || null,
      languages: parseSkills(formData.get("languages")).length
        ? parseSkills(formData.get("languages"))
        : ["English"],
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/talent");
  redirect(`/talent/${user.id}`);
}

/** Post a new project as the logged-in client (matches the /post form). */
export async function createJob(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      client_id: user.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      budget_cad: parseMoney(formData.get("budget")),
      budget_type: "fixed",
      skills: parseSkillsMulti(formData, "skills"),
      location: String(formData.get("location") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

/** Submit a proposal on a job as the logged-in freelancer. */
export async function createProposal(jobId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("proposals").insert({
    job_id: jobId,
    freelancer_id: user.id,
    cover_letter: String(formData.get("cover_letter") ?? "").trim(),
    bid_cad: parseMoney(formData.get("bid_cad")),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
}

/** Job owner accepts or declines a proposal. */
export async function setProposalStatus(
  jobId: string,
  proposalId: string,
  status: "accepted" | "declined"
) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", proposalId)
    .eq("job_id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
}

/** Job owner closes / reopens their job. */
export async function setJobStatus(
  jobId: string,
  status: "open" | "in_progress" | "closed"
) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}
