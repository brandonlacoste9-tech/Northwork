"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { seedJobs, type BudgetType, type Job, type WorkLocation } from "@/lib/data";

export type NewJobInput = {
  title: string;
  description: string;
  budget: number;
  budgetMax?: number;
  budgetType?: BudgetType;
  duration?: string;
  skills: string[];
  location: WorkLocation;
};

type MarketplaceValue = {
  jobs: Job[];
  addJob: (input: NewJobInput) => Job;
};

const MarketplaceContext = createContext<MarketplaceValue | null>(null);

export function MarketplaceProvider({
  children,
  initialJobs,
}: {
  children: React.ReactNode;
  /**
   * When provided (Supabase configured), the job board renders these
   * server-fetched jobs instead of the sample-data preview list.
   */
  initialJobs?: Job[];
}) {
  const [posted, setPosted] = useState<Job[]>([]);

  const addJob = useCallback((input: NewJobInput) => {
    const max = input.budgetMax && input.budgetMax >= input.budget ? input.budgetMax : input.budget;
    const job: Job = {
      id: `local-${crypto.randomUUID()}`,
      title: input.title.trim(),
      description: input.description
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      budgetMin: input.budget,
      budgetMax: max,
      budgetType: input.budgetType ?? "fixed",
      duration: input.duration?.trim() || null,
      location: input.location,
      skills: input.skills,
      postedAt: Date.now(),
      postedLabel: "Just now",
      client: "Posted in this browser",
      postedLocally: true,
      proposalCount: 0,
      clientVerified: false,
      clientMemberSince: new Date().toISOString(),
      clientOpenJobs: 1,
    };
    setPosted((current) => [job, ...current]);
    return job;
  }, []);

  const jobs = useMemo(
    () =>
      initialJobs ??
      [...posted, ...seedJobs].sort((a, b) => b.postedAt - a.postedAt),
    [posted, initialJobs],
  );

  const value = useMemo(() => ({ jobs, addJob }), [jobs, addJob]);

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const value = useContext(MarketplaceContext);
  if (!value) {
    throw new Error("useMarketplace must be used within MarketplaceProvider");
  }
  return value;
}
