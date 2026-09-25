import Link from "next/link";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <Link href="/" className="font-medium text-foreground">
            Northernwork
          </Link>{" "}
          · northernwork.ca
        </p>
        <p>{t("footer.about")}</p>
        <p className="flex gap-4">
          <Link href="/terms" className="hover:text-foreground">
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("footer.privacy")}
          </Link>
        </p>
      </div>
    </footer>
  );
}