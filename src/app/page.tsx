import type { Metadata } from "next";
import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { TalentCard } from "@/components/talent-card";
import { Button } from "@/components/ui/button";
import { freelancers, seedJobs } from "@/lib/data";

export const metadata: Metadata = {
  title: {
    absolute: "Northernwork — Freelance marketplace for Canada",
  },
  description:
    "Hire independents who live and work in Canada. Northernwork lists CAD rates, cities, and provinces, and keeps remote work inside the country.",
};

const clientSteps = [
  {
    title: "Name the work in CAD",
    body: "Post a title, a description, a budget in Canadian dollars, and a province — or mark the brief remote inside Canada.",
  },
  {
    title: "Filter the people who can do it",
    body: "Search by name or skill, then narrow by province and hourly rate. Every profile says where that person works.",
  },
  {
    title: "Invite them from the profile",
    body: "The invite confirms on your device in this preview. Northernwork does not email anyone and does not open a contract.",
  },
];

const freelancerSteps = [
  {
    title: "Show the work and the rate",
    body: "Profiles carry a city, a province, a CAD hourly rate, skills, and a few samples. That is what a client sees.",
  },
  {
    title: "Read briefs from Canadian clients",
    body: "The job board lists open projects with a budget, a place, and the skills the client asked for.",
  },
  {
    title: "Stay inside the country",
    body: "If the client or the freelancer is outside Canada, the work does not belong on northernwork.com.",
  },
];

export default function HomePage() {
  const featuredPeople = freelancers.slice(0, 3);
  const featuredJobs = seedJobs.slice(0, 3);

  return (
    <main>
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.35fr_0.8fr] md:py-20">
          <div>
            <p className="text-sm font-medium tracking-wide text-primary">
              Canada only · northernwork.com
            </p>
            <h1 className="mt-3 max-w-xl font-heading text-4xl tracking-tight text-balance sm:text-5xl md:text-6xl">
              Hire independents who work in Canada.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Northernwork connects clients and freelancers who live and work
              here. Rates are in CAD. Every profile names a city and a
              province. Remote means remote inside Canada, not a worldwide
              talent pool with a maple leaf on it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 px-5">
                <Link href="/talent">Browse talent</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5">
                <Link href="/jobs">Browse jobs</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {freelancers.length} independents · {seedJobs.length} open
              projects · budgets in CAD
            </p>
          </div>
          <aside className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
            <p className="font-heading text-2xl tracking-tight">
              The work stays here.
            </p>
            <p className="mt-3 leading-7 text-primary-foreground/85">
              A client in Edmonton hiring a designer in Montréal belongs on
              Northernwork. A brief for a team outside Canada does not. This
              preview keeps that rule in the copy, the filters, and the
              project form.
            </p>
            <Button
              asChild
              variant="secondary"
              className="mt-6 h-11 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/post">Post a project</Link>
            </Button>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-heading text-3xl tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium tracking-wide text-primary">
              For clients
            </h3>
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
            <h3 className="text-sm font-medium tracking-wide text-primary">
              For freelancers
            </h3>
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
              <h2 className="font-heading text-3xl tracking-tight">
                Independents on Northernwork
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                A sample of people you can hire in Canada. Open a profile for
                the rate, the city, and recent work.
              </p>
            </div>
            <Button asChild variant="outline" className="h-10">
              <Link href="/talent">Browse all talent</Link>
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
            <h2 className="font-heading text-3xl tracking-tight">
              Open projects
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Briefs from Canadian clients, with budgets in CAD and a province
              or remote-in-Canada.
            </p>
          </div>
          <Button asChild variant="outline" className="h-10">
            <Link href="/jobs">Browse all jobs</Link>
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
