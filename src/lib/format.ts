import type { Locale } from "@/lib/i18n";

function money(amount: number, locale: Locale) {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === "fr" ? `${formatted} $ CAD` : `$${formatted} CAD`;
}

export function formatCad(amount: number, locale: Locale = "en") {
  return money(amount, locale);
}

export function formatHourly(amount: number, locale: Locale = "en") {
  const base = money(amount, locale);
  return locale === "fr" ? base.replace(" CAD", " CAD/h") : `${base.replace(" CAD", "")} CAD/hr`;
}

export function formatBudget(min: number, max: number, locale: Locale = "en") {
  const one = (amount: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      maximumFractionDigits: 0,
    }).format(amount);
  const suffix = locale === "fr" ? " $ CAD" : " CAD";
  const prefix = locale === "fr" ? "" : "$";
  if (min === max) return `${prefix}${one(min)}${suffix}`;
  return `${prefix}${one(min)}–${prefix}${one(max)}${suffix}`;
}

export function formatJobBudget(
  min: number,
  max: number,
  type: "fixed" | "hourly",
  locale: Locale = "en",
) {
  const base = formatBudget(min, max, locale);
  if (type !== "hourly") return base;
  return locale === "fr" ? base.replace(" CAD", " CAD/h") : base.replace(" CAD", " CAD/hr");
}

export function postedAgo(postedAt: number, locale: Locale = "en"): string {
  const seconds = Math.max(0, Math.floor((Date.now() - postedAt) / 1000));
  const fr = locale === "fr";
  if (seconds < 60) return fr ? "À l'instant" : "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return fr ? `${minutes} min` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fr ? `${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return fr ? `${days} j` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return fr ? `${months} mois` : `${months}mo ago`;
}

export function memberSinceLabel(iso: string | null | undefined, locale: Locale = "en") {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "short",
    year: "numeric",
  });
  return locale === "fr" ? `Membre depuis ${formatted}` : `Member since ${formatted}`;
}

export function availabilityLabel(value: string, locale: Locale) {
  if (locale !== "fr") return value;
  if (value === "Available now") return "Disponible maintenant";
  if (value === "Available this week") return "Disponible cette semaine";
  if (value === "Booking in two weeks") return "Libre dans deux semaines";
  if (value === "Limited") return "Disponibilité limitée";
  return value;
}
