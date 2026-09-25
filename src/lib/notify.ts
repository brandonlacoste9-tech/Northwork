import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AlertKind =
  | "invite"
  | "pitch"
  | "hire"
  | "decline"
  | "message"
  | "payment_held"
  | "payment_released"
  | "payment_refunded";

/** In-app alert, plus email when RESEND_API_KEY is set. Failures must not block the hire. */
export async function notifyUser(
  supabase: Supabase,
  input: { userId: string; kind: AlertKind; body: string; href?: string | null },
) {
  try {
    const { error } = await supabase.rpc("add_notification", {
      target: input.userId,
      kind: input.kind,
      body: input.body.slice(0, 500),
      href: input.href ?? null,
    });
    if (error) return;
    await sendNotificationEmail(supabase, input);
  } catch {
    // Alerts are best-effort.
  }
}

async function sendNotificationEmail(
  supabase: Supabase,
  input: { userId: string; kind: AlertKind; body: string; href?: string | null },
) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM;
  if (!key || !from) return;
  const { data: email } = await supabase.rpc("party_email", { target: input.userId });
  if (typeof email !== "string" || !email.includes("@")) return;
  const link = input.href ? `https://northernwork.ca${input.href}` : "https://northernwork.ca/notifications";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Northernwork",
      text: `${input.body}\n\n${link}`,
    }),
  });
}
