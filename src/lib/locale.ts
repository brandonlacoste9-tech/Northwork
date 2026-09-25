"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get("locale")?.value === "fr" ? "fr" : "en";
}

export async function setLocale(formData: FormData) {
  const next = formData.get("locale") === "fr" ? "fr" : "en";
  const jar = await cookies();
  jar.set("locale", next, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
