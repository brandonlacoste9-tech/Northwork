"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/locale-provider";

export function TrustBadge({
  kind,
  className,
}: {
  kind: "sample" | "verified" | "pro";
  className?: string;
}) {
  const t = useT();
  const label =
    kind === "sample" ? "badge.sample" : kind === "pro" ? "badge.pro" : "badge.verified";
  return (
    <Badge variant={kind === "sample" ? "outline" : "secondary"} className={className}>
      {t(label)}
    </Badge>
  );
}
