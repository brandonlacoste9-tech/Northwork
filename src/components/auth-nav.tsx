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
export async function AuthNav({ stacked = false }: { stacked?: boolean }) {
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
        <Button asChild variant="ghost" className={stacked ? "h-11 w-full justify-start px-3" : "h-10 px-3"}>
          <Link href="/login">{t("nav.login")}</Link>
        </Button>
        <Button asChild variant="outline" className={stacked ? "h-11 w-full justify-start px-3" : "h-10 px-3"}>
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
        className={
          stacked
            ? "rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
            : "text-sm font-medium text-foreground/80 hover:text-foreground"
        }
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
        className={
          stacked
            ? "rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
            : "text-sm font-medium text-foreground/80 hover:text-foreground"
        }
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
        className={
          stacked
            ? "rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
            : "text-sm font-medium text-foreground/80 hover:text-foreground"
        }
      >
        {t("nav.profile")}
      </Link>
      <form action={signOut} className={stacked ? "w-full" : undefined}>
        <Button type="submit" variant="ghost" className={stacked ? "h-11 w-full justify-start px-3" : "h-10 px-3"}>
          {t("nav.signout")}
        </Button>
      </form>
    </>
  );
}
