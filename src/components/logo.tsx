import Image from "next/image";
import { cn } from "cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/northernwork-logo.jpg"
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-md"
        priority
      />
      <span className="font-heading text-lg leading-none tracking-tight">
        Northernwork
      </span>
    </span>
  );
}
