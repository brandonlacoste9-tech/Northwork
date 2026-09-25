import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function JobNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="text-sm font-medium text-primary">northernwork.ca</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">
        This project is not listed
      </h1>
      <p className="mt-3 text-muted-foreground">
        The link may be wrong, or the project is no longer on the board.
      </p>
      <Button asChild className="mt-6 h-10 px-4">
        <Link href="/jobs">Back to jobs</Link>
      </Button>
    </main>
  );
}
