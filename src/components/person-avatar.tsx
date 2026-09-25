import { cn } from "cn";
import { initials } from "@/lib/data";

const tones = [
  "bg-primary text-primary-foreground",
  "bg-[oklch(0.4_0.07_230)] text-[oklch(0.97_0.01_95)]",
  "bg-[oklch(0.46_0.1_55)] text-[oklch(0.98_0.01_95)]",
  "bg-[oklch(0.34_0.05_255)] text-[oklch(0.97_0.01_95)]",
  "bg-[oklch(0.42_0.06_145)] text-[oklch(0.98_0.01_95)]",
];

export function PersonAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <span
        className={cn(
          "grid size-11 shrink-0 overflow-hidden rounded-full bg-muted",
          className,
        )}
      >
        {/* blob: previews from the file input are not valid for next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="size-full object-cover" />
      </span>
    );
  }

  const tone =
    tones[
      name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        tones.length
    ];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full font-heading text-sm",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
