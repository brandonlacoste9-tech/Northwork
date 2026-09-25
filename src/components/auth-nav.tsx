import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listConversations, signOut } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-rendered auth area for the site header. Renders nothing while the
 * app runs the zero-config sample-data preview.
 */
export async function AuthNav() {
  if (!isSupabaseConfigured()) return null;
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" className="h-10 px-4">
          <Link href="/login">{t("nav.login")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/signup">{t("nav.signup")}</Link>
        </Button>
      </>
    );
  }

  const conversations = await listConversations();
  const unread = conversations.reduce((sum, item) => sum + item.unread, 0);
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <>
      <Link
        href="/notifications"
        className="text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        {t("nav.alerts")}
        {(count ?? 0) > 0 ? (
          <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
            {count}
          </span>
        ) : null}
      </Link>
      <Link
        href="/messages"
        className="text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        {t("nav.inbox")}
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
        {t("nav.profile")}
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="h-10 px-4">
          {t("nav.signout")}
        </Button>
      </form>
    </>
  );
}
