import type { Locale } from "@/lib/i18n";

export const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

export type Province = (typeof PROVINCES)[number];

export const REMOTE_IN_CANADA = "Remote in Canada";

const CODE_TO_PROVINCE: Record<string, Province> = {
  ab: "Alberta",
  bc: "British Columbia",
  mb: "Manitoba",
  nb: "New Brunswick",
  nl: "Newfoundland and Labrador",
  nt: "Northwest Territories",
  ns: "Nova Scotia",
  nu: "Nunavut",
  on: "Ontario",
  pe: "Prince Edward Island",
  pei: "Prince Edward Island",
  qc: "Quebec",
  sk: "Saskatchewan",
  yt: "Yukon",
  yukon: "Yukon",
};

const FRENCH_NAME: Record<Province, string> = {
  Alberta: "Alberta",
  "British Columbia": "Colombie-Britannique",
  Manitoba: "Manitoba",
  "New Brunswick": "Nouveau-Brunswick",
  "Newfoundland and Labrador": "Terre-Neuve-et-Labrador",
  "Northwest Territories": "Territoires du Nord-Ouest",
  "Nova Scotia": "Nouvelle-Écosse",
  Nunavut: "Nunavut",
  Ontario: "Ontario",
  "Prince Edward Island": "Île-du-Prince-Édouard",
  Quebec: "Québec",
  Saskatchewan: "Saskatchewan",
  Yukon: "Yukon",
};

function fold(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Turn "QC", "Québec", or "Quebec" into the province used by the filters. */
export function canonicalProvince(value: string | null | undefined): Province | null {
  if (!value?.trim()) return null;
  const key = fold(value);
  return CODE_TO_PROVINCE[key] ?? PROVINCES.find((province) => fold(province) === key) ?? null;
}

export function provinceLabel(province: Province, locale: Locale) {
  return locale === "fr" ? FRENCH_NAME[province] : province;
}

export function isRemoteInCanada(location: string | null | undefined) {
  if (!location) return false;
  const value = fold(location);
  return value === fold(REMOTE_IN_CANADA) || value === "a distance au canada";
}

/** Last token of "Montreal, QC" or a bare province name. */
export function provinceFromLocation(location: string | null | undefined): Province | null {
  if (!location || isRemoteInCanada(location)) return null;
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return canonicalProvince(parts[parts.length - 1]) ?? canonicalProvince(location);
}

export function formatJobLocation(location: string, locale: Locale) {
  if (isRemoteInCanada(location)) {
    return locale === "fr" ? "À distance au Canada" : REMOTE_IN_CANADA;
  }
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const province = canonicalProvince(parts[parts.length - 1]);
    const city = parts.slice(0, -1).join(", ");
    if (province) return `${city}, ${provinceLabel(province, locale)}`;
  }
  const province = canonicalProvince(location);
  if (province) return provinceLabel(province, locale);
  return location.trim();
}

export function formatPersonPlace(city: string, province: string, locale: Locale) {
  const canon = canonicalProvince(province);
  const name = canon ? provinceLabel(canon, locale) : province.trim();
  const placeCity = city.trim();
  if (placeCity && name) return `${placeCity}, ${name}`;
  return placeCity || name;
}
