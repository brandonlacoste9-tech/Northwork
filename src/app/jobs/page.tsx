import type { Metadata } from "next";
import { JobBoard } from "@/components/job-board";

export const metadata: Metadata = {
  title: "Open projects",
  description:
    "Open freelance projects from Canadian clients. Budgets in CAD, with a province or remote inside Canada.",
};

export default function JobsPage() {
  return (
    <main>
      <div className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm font-medium text-primary">northernwork.com</p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight">
            Open projects
          </h1>
          <p className="mt-3 text-muted-foreground">
            Briefs from Canadian clients. A project you post in this browser
            appears at the top of the list.
          </p>
        </div>
      </div>
      <JobBoard />
    </main>
  );
}
