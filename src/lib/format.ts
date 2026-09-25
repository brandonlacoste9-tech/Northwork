export function formatCad(amount: number) {
  const formatted = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `$${formatted} CAD`;
}

export function formatHourly(amount: number) {
  const formatted = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `$${formatted} CAD/hr`;
}

export function formatBudget(min: number, max: number) {
  const money = (amount: number) =>
    `$${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(amount)}`;
  if (min === max) return `${money(min)} CAD`;
  return `${money(min)}–${money(max)} CAD`;
}

export function postedAgo(postedAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - postedAt) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function memberSinceLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Member since ${date.toLocaleDateString("en-CA", {
    month: "short",
    year: "numeric",
  })}`;
}
