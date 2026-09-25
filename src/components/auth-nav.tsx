import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listConversations, signOut } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-rendered auth area for the site header. Renders nothing while the
 * app runs the zero-config sample-data preview.
 */
export async function AuthNav() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" className="h-10 px-4">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/signup">Sign up</Link>
        </Button>
      </>
    );
  }

  const conversations = await listConversations();
  const unread = conversations.reduce((sum, item) => sum + item.unread, 0);

  return (
    <>
      <Link
        href="/messages"
        className="text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        Inbox
        {unread > 0 ? (
          <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
            {unread}
          </span>
        ) : null}
      </Link>
      <Link
        href="/profile"
        className="text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        My profile
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="h-10 px-4">
          Sign out
        </Button>
      </form>
    </>
  );
}
