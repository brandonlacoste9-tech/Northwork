import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <Link href="/" className="font-medium text-foreground">
            Northernwork
          </Link>{" "}
          · northernwork.com
        </p>
        <p>A freelance marketplace for clients and freelancers in Canada.</p>
      </div>
    </footer>
  );
}
