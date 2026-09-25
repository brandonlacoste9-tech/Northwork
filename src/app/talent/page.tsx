import type { Metadata } from "next";
import { TalentDirectory } from "@/components/talent-directory";
import { loadTalentDirectory } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Talent",
  description:
    "Browse Canadian freelancers on Northernwork. Filter by province, skill, and CAD hourly rate.",
};

export default async function TalentPage() {
  const people = await loadTalentDirectory();

  return (
    <main>
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm font-medium text-primary">northernwork.ca</p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight">Canadian freelancers</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Search by name or skill, then filter by province and hourly rate in CAD. Everyone listed here works in Canada.
          </p>
        </div>
      </div>
      <TalentDirectory people={people} />
    </main>
  );
}