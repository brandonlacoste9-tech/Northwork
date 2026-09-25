"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { seedJobs, type Job, type WorkLocation } from "@/lib/data";

export type NewJobInput = {
  title: string;
  description: string;
  budget: number;
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
}: {
  children: React.ReactNode;
}) {
  const [posted, setPosted] = useState<Job[]>([]);

  const addJob = useCallback((input: NewJobInput) => {
    const job: Job = {
      id: `local-${crypto.randomUUID()}`,
      title: input.title.trim(),
      description: input.description
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      budgetMin: input.budget,
      budgetMax: input.budget,
      location: input.location,
      skills: input.skills,
      postedAt: Date.now(),
      postedLabel: "Just now",
      client: "Posted in this browser",
      postedLocally: true,
    };
    setPosted((current) => [job, ...current]);
    return job;
  }, []);

  const jobs = useMemo(
    () =>
      [...posted, ...seedJobs].sort((a, b) => b.postedAt - a.postedAt),
    [posted],
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
