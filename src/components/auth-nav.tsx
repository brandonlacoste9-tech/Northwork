import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions";
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

  return (
    <>
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
