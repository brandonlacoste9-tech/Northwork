import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="currentColor"
        >
          <path d="M12 2.5 18.5 19.5 12 15.2 5.5 19.5 12 2.5Z" />
        </svg>
      </span>
      <span className="font-heading text-lg leading-none tracking-tight">
        Northernwork
      </span>
    </span>
  );
}
