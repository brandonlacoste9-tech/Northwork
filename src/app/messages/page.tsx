import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listConversations } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";

export const metadata: Metadata = {
  title: "Messages",
  description: "Threads between clients and freelancers on Northernwork.",
};

export default async function MessagesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">
              Messages are off in preview
            </CardTitle>
            <CardDescription>
              This copy of Northernwork is running on sample data. Connect a
              Supabase project to message someone after a pitch is accepted —
              see the README.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const conversations = await listConversations();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-primary">northernwork.com</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">Messages</h1>
      <p className="mt-3 text-muted-foreground">
        Threads open when a client and a freelancer are on the same pitch.
        One thread per project.
      </p>
      {conversations.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No conversations yet.{" "}
          <Link href="/jobs" className="font-medium text-primary hover:underline">
            Browse open projects
          </Link>{" "}
          or accept a pitch to start one.
        </p>
      ) : (
        <ul className="mt-8 divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/60"
              >
                <span>
                  <span className="block font-medium">{conversation.otherName}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {conversation.jobTitle}
                  </span>
                  <span className="mt-1 block text-sm text-foreground/80">
                    {conversation.preview}
                  </span>
                </span>
                {conversation.unread > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {conversation.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
