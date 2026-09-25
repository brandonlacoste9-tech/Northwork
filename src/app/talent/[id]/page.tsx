import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FreelancerProfile,
  type ProfileReview,
} from "@/components/freelancer-profile";
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
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id")
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false });
    const rows = (reviewRows ?? []) as {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    }[];
    const reviewerIds = [...new Set(rows.map((row) => row.reviewer_id))];
    const names: Record<string, string> = {};
    if (reviewerIds.length > 0) {
      const { data: reviewers } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", reviewerIds);
      for (const reviewer of (reviewers ?? []) as Pick<
        ProfileRow,
        "id" | "display_name"
      >[]) {
        names[reviewer.id] = reviewer.display_name || "Northernwork member";
      }
    }
    const reviews: ProfileReview[] = rows.map((row) => ({
      id: row.id,
      reviewerName: names[row.reviewer_id] || "Northernwork member",
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    }));
    return (
      <main>
        <FreelancerProfile person={person} reviews={reviews} />
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
