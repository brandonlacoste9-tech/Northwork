"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { PROVINCES } from "@/lib/data";
import { dispatchInstantJobAlerts } from "@/lib/job-alerts";
import { featureJob } from "@/lib/pitches";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notify";

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

/** Make sure the signed-in user has a profile row so messaging can reference it. */
async function ensureOwnProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (data) return;
  const { error } = await supabase.from("profiles").insert({ id: userId });
  if (error) throw new Error(error.message);
}

async function openConversation(jobId: string, freelancerId: string) {
  const { supabase, user } = await requireUser();
  await ensureOwnProfile(supabase, user.id);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, client_id")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  if (!job) throw new Error("That project is not listed.");

  const isClient = user.id === job.client_id;
  const isFreelancer = user.id === freelancerId;
  if (!isClient && !isFreelancer) {
    throw new Error("Only the client or the freelancer on this pitch can open the thread.");
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("status")
    .eq("job_id", jobId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();
  if (proposalError) throw new Error(proposalError.message);
  if (!proposal || (proposal.status !== "pending" && proposal.status !== "accepted")) {
    throw new Error("There is no open pitch to talk about.");
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      job_id: jobId,
      client_id: job.client_id,
      freelancer_id: freelancerId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

export type InboxConversation = {
  id: string;
  jobTitle: string;
  otherName: string;
  preview: string;
  unread: number;
  updatedAt: string;
};

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** Open the thread for a pitch, creating it when this is the first message. */
export async function getOrCreateConversation(jobId: string, freelancerId: string) {
  const id = await openConversation(jobId, freelancerId);
  redirect(`/messages/${id}`);
}

export async function listConversations(): Promise<InboxConversation[]> {
  const { supabase, user } = await requireUser();
  const { data: rows, error } = await supabase
    .from("conversations")
    .select("id, job_id, client_id, freelancer_id, created_at")
    .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const conversations = rows ?? [];
  if (conversations.length === 0) return [];

  const ids = conversations.map((row) => row.id);
  const profileIds = [
    ...new Set(conversations.flatMap((row) => [row.client_id, row.freelancer_id])),
  ];
  const jobIds = [...new Set(conversations.map((row) => row.job_id))];

  const [{ data: profiles }, { data: jobs }, { data: messages }, { data: reads }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", profileIds),
      supabase.from("jobs").select("id, title").in("id", jobIds),
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_reads")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)
        .in("conversation_id", ids),
    ]);

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, (profile.display_name as string | null) || "Northernwork member"])
  );
  const titleById = new Map(
    (jobs ?? []).map((job) => [job.id as string, (job.title as string) || "Project"])
  );
  const readAt = new Map(
    (reads ?? []).map((read) => [read.conversation_id as string, Date.parse(read.last_read_at as string)])
  );
  const latest = new Map<string, { body: string; created_at: string }>();
  const unread = new Map<string, number>();
  for (const message of messages ?? []) {
    const conversationId = message.conversation_id as string;
    if (!latest.has(conversationId)) {
      latest.set(conversationId, {
        body: message.body as string,
        created_at: message.created_at as string,
      });
    }
    const sentAt = Date.parse(message.created_at as string);
    const seenAt = readAt.get(conversationId) ?? 0;
    if (message.sender_id !== user.id && sentAt > seenAt) {
      unread.set(conversationId, (unread.get(conversationId) ?? 0) + 1);
    }
  }

  return conversations
    .map((row) => {
      const otherId = row.client_id === user.id ? row.freelancer_id : row.client_id;
      const last = latest.get(row.id);
      return {
        id: row.id as string,
        jobTitle: titleById.get(row.job_id) ?? "Project",
        otherName: nameById.get(otherId) ?? "Northernwork member",
        preview: last?.body ?? "No messages yet",
        unread: unread.get(row.id) ?? 0,
        updatedAt: last?.created_at ?? (row.created_at as string),
      };
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message." };
  if (body.length > 5000) return { error: "Keep the message under 5,000 characters." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    })
    .select("id, sender_id, body, created_at")
    .single();
  if (error) return { error: error.message };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("client_id, freelancer_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversation) {
    const otherId =
      conversation.client_id === user.id ? conversation.freelancer_id : conversation.client_id;
    await notifyUser(supabase, {
      userId: otherId as string,
      kind: "message",
      body,
      href: `/messages/${conversationId}`,
    });
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { message: data as ThreadMessage };
}

export async function markConversationRead(conversationId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("conversation_reads").upsert(
    {
      conversation_id: conversationId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" }
  );
  if (error) throw new Error(error.message);
}

/** Sign the current user out (used by the header sign-out button). */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

export async function markNotificationsRead() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/notifications");
  revalidatePath("/");
}

/** Client invites a freelancer onto one of their own projects and opens the thread. */
export async function inviteFreelancer(freelancerId: string, jobId: string, note: string) {
  const { supabase, user } = await requireUser();
  const body = note.trim();
  if (!body) return { error: "Add a note about the work." };
  if (body.length > 4000) return { error: "Keep the note under 4,000 characters." };
  if (freelancerId === user.id) return { error: "You cannot invite yourself." };

  await ensureOwnProfile(supabase, user.id);
  const { data: freelancer } = await supabase
    .from("profiles")
    .select("id, is_sample, display_name")
    .eq("id", freelancerId)
    .maybeSingle();
  if (!freelancer) return { error: "That person does not have a profile yet." };
  if (freelancer.is_sample) return { error: "Sample profiles cannot be hired." };

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, title, client_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) return { error: jobError.message };
  if (!job || job.client_id !== user.id) return { error: "Choose one of your projects." };
  if (job.status === "closed") return { error: "That project is closed." };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        job_id: jobId,
        client_id: user.id,
        freelancer_id: freelancerId,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    conversationId = created.id as string;
  }

  const message = `Invitation — ${job.title}\n\n${body}`;
  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: message.slice(0, 5000),
  });
  if (messageError) return { error: messageError.message };

  await notifyUser(supabase, {
    userId: freelancerId,
    kind: "invite",
    body: String(job.title),
    href: `/messages/${conversationId}`,
  });
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { conversationId };
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
  await ensureOwnProfile(supabase, user.id);

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      client_id: user.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      budget_cad: parseMoney(formData.get("budget")),
      budget_max_cad: (() => {
        const min = parseMoney(formData.get("budget"));
        const max = parseMoney(formData.get("budget_max"));
        return min != null && max != null && max >= min ? max : null;
      })(),
      budget_type: String(formData.get("budget_type") ?? "fixed") === "hourly" ? "hourly" : "fixed",
      duration: String(formData.get("duration") ?? "").trim() || null,
      skills: parseSkillsMulti(formData, "skills"),
      location: String(formData.get("location") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  try {
    await featureJob(data.id);
  } catch {
    // A featured-job alert must not block the post.
  }
  try {
    await dispatchInstantJobAlerts(data.id);
  } catch {
    // A saved-search alert must not block the post.
  }
  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

export async function saveJobSearch(formData: FormData) {
  const { supabase, user } = await requireUser();
  await ensureOwnProfile(supabase, user.id);
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) return { error: "Name the search in 80 characters or less." };
  const provinceRaw = String(formData.get("province") ?? "").trim();
  const province =
    provinceRaw && (PROVINCES as readonly string[]).includes(provinceRaw) ? provinceRaw : null;
  const typeRaw = String(formData.get("budget_type") ?? "");
  const budgetType = typeRaw === "fixed" || typeRaw === "hourly" ? typeRaw : null;
  const remote = String(formData.get("remote_only") ?? "") === "1";
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name,
    skills: parseSkills(formData.get("skills")),
    min_budget_cad: parseMoney(formData.get("min_budget_cad")),
    budget_type: budgetType,
    province: remote ? null : province,
    remote_only: remote,
  });
  if (error) return { error: error.message };
  revalidatePath("/settings/alerts");
  return { ok: true as const };
}

export async function updateSavedSearchFrequency(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const frequency = String(formData.get("alert_frequency") ?? "");
  if (!id || !["instant", "daily", "off"].includes(frequency)) return;
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
  if (!id) return;
  const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/alerts");
}

function pitchTokensRequired(err: unknown) {
  return err instanceof Error && err.message.includes("pitch_tokens_required");
}

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/** Submit a proposal on a job as the logged-in freelancer. One pitch costs one token unless the freelancer is Pro. */
export async function createProposal(jobId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await ensureOwnProfile(supabase, user.id);
  const cover = String(formData.get("cover_letter") ?? "").trim();
  if (!cover) throw new Error("Write a cover letter before you send the pitch.");

  try {
    await getDb().begin(async (tx) => {
      await tx`select private.spend_pitch(${user.id}::uuid)`;
      await tx`
        insert into public.proposals (job_id, freelancer_id, cover_letter, bid_cad)
        values (
          ${jobId}::uuid,
          ${user.id}::uuid,
          ${cover},
          ${parseMoney(formData.get("bid_cad"))}
        )
      `;
    });
  } catch (err) {
    if (pitchTokensRequired(err)) {
      redirect(`/jobs/${jobId}?tokens=0#pitch`);
    }
    if (isUniqueViolation(err)) {
      throw new Error("You already pitched on this project.");
    }
    throw err instanceof Error ? err : new Error("That pitch could not be sent.");
  }
  const { data: job } = await supabase
    .from("jobs")
    .select("client_id, title")
    .eq("id", jobId)
    .maybeSingle();
  if (job && job.client_id !== user.id) {
    await notifyUser(supabase, {
      userId: job.client_id as string,
      kind: "pitch",
      body: String(job.title ?? "Project"),
      href: `/jobs/${jobId}`,
    });
  }
  revalidatePath(`/jobs/${jobId}`);
}

/** Job owner accepts or declines a proposal. */
export async function setProposalStatus(
  jobId: string,
  proposalId: string,
  status: "accepted" | "declined"
) {
  const { supabase } = await requireUser();

  const { data: proposal, error: lookupError } = await supabase
    .from("proposals")
    .select("freelancer_id")
    .eq("id", proposalId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!proposal) throw new Error("That pitch is not on this project.");

  const { error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", proposalId)
    .eq("job_id", jobId);

  if (error) throw new Error(error.message);

  if (status === "accepted") {
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "in_progress" })
      .eq("id", jobId);
    if (jobError) throw new Error(jobError.message);

    const { error: declineError } = await supabase
      .from("proposals")
      .update({ status: "declined" })
      .eq("job_id", jobId)
      .eq("status", "pending");
    if (declineError) throw new Error(declineError.message);

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    const conversationId = await openConversation(jobId, proposal.freelancer_id);
    await notifyUser(supabase, {
      userId: proposal.freelancer_id as string,
      kind: "hire",
      body: "The client accepted your pitch.",
      href: `/messages/${conversationId}`,
    });
    redirect(`/messages/${conversationId}`);
  }

  await notifyUser(supabase, {
    userId: proposal.freelancer_id as string,
    kind: "decline",
    body: "The client declined your pitch.",
    href: `/jobs/${jobId}`,
  });
  revalidatePath(`/jobs/${jobId}`);
}

/** Leave one review on a closed project. The other party is chosen from the hire, not the form. */
export async function createReview(jobId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const rating = Number(String(formData.get("rating") ?? ""));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5." };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, client_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) return { error: jobError.message };
  if (!job) return { error: "That project is not listed." };
  if (job.status !== "closed") {
    return { error: "Reviews open after the project is closed." };
  }

  const { data: accepted, error: proposalError } = await supabase
    .from("proposals")
    .select("freelancer_id")
    .eq("job_id", jobId)
    .eq("status", "accepted")
    .maybeSingle();
  if (proposalError) return { error: proposalError.message };
  if (!accepted) return { error: "This project has no hired freelancer to review." };

  const isClient = user.id === job.client_id;
  const isFreelancer = user.id === accepted.freelancer_id;
  if (!isClient && !isFreelancer) {
    return { error: "Only the client and the hired freelancer can review this project." };
  }
  const revieweeId = isClient ? accepted.freelancer_id : job.client_id;

  const { error } = await supabase.from("reviews").insert({
    job_id: jobId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment || null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { error: "You already reviewed this project." };
    }
    return { error: error.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/talent/${revieweeId}`);
  redirect(`/jobs/${jobId}`);
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

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Store a profile photo under avatars/{user-id}/ and save the public URL. */
export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await requireUser();
  await ensureOwnProfile(supabase, user.id);

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Photos must be 5 MB or smaller." };
  }
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG, or WebP photo." };

  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/talent");
  revalidatePath(`/talent/${user.id}`);
  return { url: avatarUrl };
}

/** Add one portfolio piece. Image is optional and stored under portfolio/{user-id}/. */
export async function addPortfolioItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  await ensureOwnProfile(supabase, user.id);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Add a title." };
  if (title.length > 120) return { error: "Keep the title under 120 characters." };

  const rawUrl = String(formData.get("url") ?? "").trim();
  if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
    return { error: "The link must start with http:// or https://." };
  }

  const { count } = await supabase
    .from("portfolio_items")
    .select("id", { count: "exact", head: true })
    .eq("freelancer_id", user.id);
  if ((count ?? 0) >= 12) return { error: "Twelve projects is the maximum." };

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: "Images must be 5 MB or smaller." };
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return { error: "Use a JPG, PNG, or WebP image." };
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    imageUrl = data.publicUrl;
  }

  const { error } = await supabase.from("portfolio_items").insert({
    freelancer_id: user.id,
    title,
    image_url: imageUrl,
    url: rawUrl || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath(`/talent/${user.id}`);
  return { ok: true };
}

export async function deletePortfolioItem(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("freelancer_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath(`/talent/${user.id}`);
}
