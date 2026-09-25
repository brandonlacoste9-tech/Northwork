import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConversationNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        That conversation is not available
      </h1>
      <p className="mt-3 text-muted-foreground">
        Threads are private. This one does not exist, or you are not part of it.
      </p>
      <Button asChild className="mt-6 h-10 px-4">
        <Link href="/messages">Back to messages</Link>
      </Button>
    </main>
  );
}
