import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import {
  markConversationRead,
  type ThreadMessage,
} from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Conversation",
};

export default async function ConversationPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/messages");

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, job_id, client_id, freelancer_id")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const otherId =
    conversation.client_id === user.id
      ? conversation.freelancer_id
      : conversation.client_id;

  const [{ data: job }, { data: other }, { data: messages }] = await Promise.all([
    supabase.from("jobs").select("title").eq("id", conversation.job_id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  await markConversationRead(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/messages"
        className="text-sm font-medium text-primary hover:underline"
      >
        All messages
      </Link>
      <h1 className="mt-4 font-heading text-3xl tracking-tight">
        {(other?.display_name as string | null) || "Northernwork member"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {(job?.title as string | null) || "Project"}
      </p>
      <div className="mt-8">
        <MessageThread
          conversationId={id}
          currentUserId={user.id}
          initialMessages={(messages ?? []) as ThreadMessage[]}
        />
      </div>
    </main>
  );
}
