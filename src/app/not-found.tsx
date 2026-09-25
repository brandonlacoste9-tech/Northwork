import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        That page is not listed
      </h1>
      <p className="mt-3 text-muted-foreground">
        The profile or page you asked for is not in this Northernwork preview.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-10 px-4">
          <Link href="/talent">Browse talent</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </main>
  );
}
