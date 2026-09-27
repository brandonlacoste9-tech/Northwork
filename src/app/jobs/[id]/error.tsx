"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Catches render and server-action failures on a job page (e.g. a pitch
 *  that could not be saved) so the visitor sees a message instead of a
 *  broken page. */
export default function JobError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 text-muted-foreground">
        That action could not be completed. Your pitch was not sent — please
        try again.
      </p>
      {error?.message ? (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {error.message}
        </p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={() => reset()} className="h-10 px-4">
          Try again
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/jobs">Back to jobs</Link>
        </Button>
      </div>
    </main>
  );
}
