import type { Metadata } from "next";
import { TalentDirectory } from "@/components/talent-directory";
import { translate, type MessageKey } from "@/lib/i18n";
import { loadTalentDirectory } from "@/lib/listings";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Talent",
  description:
    "Browse Canadian freelancers on Northernwork. Filter by province, skill, and CAD hourly rate.",
};

export default async function TalentPage() {
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const people = await loadTalentDirectory();

  return (
    <main>
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <p className="text-sm font-medium text-primary">{t("talent.kicker")}</p>
          <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">{t("talent.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("talent.lede")}</p>
        </div>
      </div>
      <TalentDirectory people={people} />
    </main>
  );
}
