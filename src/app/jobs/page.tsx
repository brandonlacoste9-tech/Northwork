import type { Metadata } from "next";
import { JobBoard } from "@/components/job-board";
import { isSupabaseConfigured } from "@/lib/backend";
import { translate, type MessageKey } from "@/lib/i18n";
import { loadOpenJobs } from "@/lib/listings";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Open projects",
  description:
    "Open freelance projects from Canadian clients. Budgets in CAD, with a province or remote inside Canada.",
};

export default async function JobsPage() {
  const locale = await getLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const jobsProp = await loadOpenJobs();

  return (
    <main>
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <p className="text-sm font-medium text-primary">{t("jobs.kicker")}</p>
          <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">{t("jobs.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {isSupabaseConfigured() ? t("jobs.lede") : t("jobs.previewLede")}
          </p>
        </div>
      </div>
      <JobBoard jobsProp={jobsProp} />
    </main>
  );
}
