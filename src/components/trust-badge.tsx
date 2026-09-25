"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/locale-provider";

export function TrustBadge({
  kind,
  className,
}: {
  kind: "sample" | "verified";
  className?: string;
}) {
  const t = useT();
  return (
    <Badge variant={kind === "sample" ? "outline" : "secondary"} className={className}>
      {t(kind === "sample" ? "badge.sample" : "badge.verified")}
    </Badge>
  );
}
