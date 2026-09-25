import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FreelancerProfile } from "@/components/freelancer-profile";
import {
  isSupabaseConfigured,
  mapProfileToFreelancer,
  type ProfileRow,
} from "@/lib/backend";
import { getFreelancer } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, title, city, province, hourly_rate_cad")
      .eq("id", id)
      .maybeSingle();
    const row = data as Pick<
      ProfileRow,
      "display_name" | "title" | "city" | "province" | "hourly_rate_cad"
    > | null;
    if (!row) return { title: "Freelancer" };
    return {
      title: row.display_name || "Freelancer",
      description: `${row.title || "Freelancer"}${row.city ? ` in ${row.city}, ${row.province}` : ""} on Northernwork.`,
    };
  }
  const person = getFreelancer(id);
  if (!person) return { title: "Freelancer" };
  return {
    title: person.name,
    description: `${person.role} in ${person.city}, ${person.province}. ${person.hourlyRate} CAD per hour on Northernwork.`,
  };
}

export default async function FreelancerPage({ params }: PageProps) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    const person = mapProfileToFreelancer(data as ProfileRow);
    return (
      <main>
        <FreelancerProfile person={person} />
      </main>
    );
  }

  const person = getFreelancer(id);
  if (!person) notFound();
  return (
    <main>
      <FreelancerProfile person={person} />
    </main>
  );
}
