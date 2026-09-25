import type { Metadata } from "next";
import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { PersonAvatar } from "@/components/person-avatar";
import { TalentCard } from "@/components/talent-card";
import { Button } from "@/components/ui/button";
import { freelancers, seedJobs, type Freelancer, type Job } from "@/lib/data";
import { formatHourly, formatJobBudget } from "@/lib/format";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { loadOpenJobs, loadTalentDirectory } from "@/lib/listings";
import { formatJobLocation, formatPersonPlace } from "@/lib/place";

export const metadata: Metadata = {
  title: {
    absolute: "Northernwork — Freelance marketplace for Canada",
  },
  description:
    "Hire independents who live and work in Canada. Northernwork lists CAD rates, cities, and provinces, and keeps remote work inside the country.",
};

function proofScore(person: Freelancer) {
  return (
    (person.hourlyRate > 0 ? 2 : 0) +
    (person.avatarUrl ? 2 : 0) +
    (person.role ? 1 : 0)
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const livePeople = await loadTalentDirectory();
  const liveJobs = await loadOpenJobs();
  const people = livePeople ?? freelancers;
  const jobs = liveJobs ?? seedJobs;
  const rankedPeople = [...people].sort((a, b) => proofScore(b) - proofScore(a) || a.name.localeCompare(b.name));
  const proofPeople = rankedPeople.filter((person) => person.hourlyRate > 0).slice(0, 2);
  const proofIds = new Set(proofPeople.map((person) => person.id));
  const featuredPeople = rankedPeople.filter((person) => !proofIds.has(person.id)).slice(0, 3);
  const proofJob = jobs.find((job) => job.budgetMin > 0) ?? jobs[0];
  const featuredJobs = jobs.filter((job) => job.id !== proofJob?.id).slice(0, 2);
  const clientSteps = [1, 2, 3].map((n) => ({
    title: t(`step.c${n}.title` as MessageKey),
    body: t(`step.c${n}.body` as MessageKey),
  }));
  const freelancerSteps = [1, 2, 3].map((n) => ({
    title: t(`step.f${n}.title` as MessageKey),
    body: t(`step.f${n}.body` as MessageKey),
  }));

  return (
    <main>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.35fr_0.8fr] md:py-20">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary">{t("home.kicker")}</p>
            <h1 className="mt-3 max-w-xl font-heading text-4xl tracking-tight text-balance sm:text-5xl md:text-6xl">
              {t("home.title")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.lede")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 px-5">
                <Link href="/talent">{t("home.talent")}</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5">
                <Link href="/jobs">{t("home.jobs")}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("home.count", { people: people.length, jobs: jobs.length })}
            </p>
          </div>
          <aside className="grid content-start gap-3">
            {proofPeople.map((person) => (
              <ProofPerson key={person.id} person={person} locale={locale} />
            ))}
            {proofJob ? <ProofJob job={proofJob} locale={locale} /> : null}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-heading text-3xl tracking-tight">{t("home.how")}</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium tracking-wide text-primary">{t("home.clients")}</h3>
            <ol className="mt-4 space-y-5">
              {clientSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-heading text-2xl text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wide text-primary">{t("home.freelancers")}</h3>
            <ol className="mt-4 space-y-5">
              {freelancerSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-heading text-2xl text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {featuredPeople.length > 0 ? (
      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-3xl tracking-tight">{t("home.peopleTitle")}</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">{t("home.peopleBody")}</p>
            </div>
            <Button asChild variant="outline" className="h-10">
              <Link href="/talent">{t("home.allTalent")}</Link>
            </Button>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {featuredPeople.map((person) => (
              <li key={person.id} className="min-w-0">
                <TalentCard person={person} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {featuredJobs.length > 0 ? (
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl tracking-tight">{t("home.projectsTitle")}</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{t("home.projectsBody")}</p>
          </div>
          <Button asChild variant="outline" className="h-10">
            <Link href="/jobs">{t("home.allJobs")}</Link>
          </Button>
        </div>
        <ul className="mt-8 grid gap-4">
          {featuredJobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      </section>
      ) : null}
    </main>
  );
}

function ProofPerson({
  person,
  locale,
}: {
  person: Freelancer;
  locale: "en" | "fr";
}) {
  const place = formatPersonPlace(person.city, person.province, locale);
  return (
    <Link
      href={`/talent/${person.id}`}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3 transition-shadow hover:ring-primary/30"
    >
      <PersonAvatar name={person.name} src={person.avatarUrl} className="size-12" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{person.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {person.role || place}
        </span>
        {person.role && place ? (
          <span className="block truncate text-sm text-muted-foreground">{place}</span>
        ) : null}
      </span>
      <span className="shrink-0 font-heading text-lg tabular-nums">
        {formatHourly(person.hourlyRate, locale)}
      </span>
    </Link>
  );
}

function ProofJob({ job, locale }: { job: Job; locale: "en" | "fr" }) {
  const budgetType = job.budgetType ?? "fixed";
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-2xl bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-95"
    >
      <span className="text-sm text-primary-foreground/80">
        {formatJobLocation(job.location, locale)}
      </span>
      <span className="mt-1 block font-heading text-xl leading-snug">{job.title}</span>
      <span className="mt-3 block font-heading text-2xl tabular-nums">
        {formatJobBudget(job.budgetMin, job.budgetMax, budgetType, locale)}
      </span>
    </Link>
  );
}
