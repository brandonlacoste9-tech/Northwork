import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreelancerProfile } from "@/components/freelancer-profile";
import { getFreelancer } from "@/lib/data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const person = getFreelancer(id);
  if (!person) return { title: "Freelancer" };
  return {
    title: person.name,
    description: `${person.role} in ${person.city}, ${person.province}. ${person.hourlyRate} CAD per hour on Northernwork.`,
  };
}

export default async function FreelancerPage({ params }: PageProps) {
  const { id } = await params;
  const person = getFreelancer(id);
  if (!person) notFound();
  return (
    <main>
      <FreelancerProfile person={person} />
    </main>
  );
}
