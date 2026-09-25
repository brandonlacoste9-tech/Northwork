"use client";

import { useT, useLocale } from "@/components/locale-provider";
import { setLocale } from "@/lib/locale";

export function LanguageSwitch() {
  const locale = useLocale();
  const t = useT();
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={locale === "fr" ? "en" : "fr"} />
      <button
        type="submit"
        className="text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        {t("nav.language")}
      </button>
    </form>
  );
}
