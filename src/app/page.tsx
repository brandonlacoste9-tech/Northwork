import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { TalentCard } from "@/components/talent-card";
import { Button } from "@/components/ui/button";
import { freelancers, seedJobs } from "@/lib/data";
import { translate, type MessageKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { loadOpenJobs, loadTalentDirectory } from "@/lib/listings";

export const metadata: Metadata = {
  title: {
    absolute: "Northernwork — Freelance marketplace for Canada",
  },
  description:
    "Hire independents who live and work in Canada. Northernwork lists CAD rates, cities, and provinces, and keeps remote work inside the country.",
};

export default async function HomePage() {
  const locale = await getLocale();
  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const livePeople = await loadTalentDirectory();
  const liveJobs = await loadOpenJobs();
  const people = livePeople ?? freelancers;
  const jobs = liveJobs ?? seedJobs;
  const samplesOnly = people.length > 0 && people.every((person) => person.sample);
  const featuredPeople = people.slice(0, 3);
  const featuredJobs = jobs.slice(0, 3);
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
          <aside className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
            <Image
              src="/northernwork-logo.jpg"
              alt="Northernwork logo: a pine, a north star, and a compass needle"
              width={512}
              height={512}
              className="mx-auto aspect-square w-full max-w-xs rounded-xl"
              priority
            />
            <p className="mt-6 font-heading text-2xl tracking-tight">{t("home.asideTitle")}</p>
            <p className="mt-3 leading-7 text-primary-foreground/85">{t("home.asideBody")}</p>
            <Button
              asChild
              variant="secondary"
              className="mt-6 h-11 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/post">{t("nav.post")}</Link>
            </Button>
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

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-3xl tracking-tight">{t("home.peopleTitle")}</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">{t("home.peopleBody")}</p>
              {samplesOnly ? (
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("home.sampleBanner")}</p>
              ) : null}
            </div>
            <Button asChild variant="outline" className="h-10">
              <Link href="/talent">{t("home.allTalent")}</Link>
            </Button>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {featuredPeople.map((person) => (
              <li key={person.id}>
                <TalentCard person={person} />
              </li>
            ))}
          </ul>
        </div>
      </section>

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
    </main>
  );
}
