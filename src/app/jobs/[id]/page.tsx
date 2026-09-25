import type { Metadata } from "next";
import { JobDetail } from "@/components/job-detail";
import { getSeedJob } from "@/lib/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = getSeedJob(id);
  if (!job) return { title: "Project" };
  return {
    title: job.title,
    description: `${job.client} · ${job.location} · a project on Northernwork.`,
  };
}

export default async function JobPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main>
      <JobDetail id={id} />
    </main>
  );
}
