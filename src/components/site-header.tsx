"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "cn";

export function SiteHeader({
  desktopAuth,
  mobileAuth,
}: {
  desktopAuth?: React.ReactNode;
  mobileAuth?: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const links = [
    { href: "/talent", label: t("nav.talent") },
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/messages", label: t("nav.messages") },
  ];

  function current(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label={t("nav.home")} className="min-w-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-4 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current(link.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium hover:text-foreground",
                current(link.href) ? "text-foreground" : "text-foreground/80",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/post">{t("nav.post")}</Link>
          </Button>
          <LanguageSwitch />
          {desktopAuth}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 lg:hidden"
              aria-label={t("nav.menu")}
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Northernwork</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current(link.href) ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-3 text-base font-medium hover:bg-muted",
                      current(link.href) && "bg-muted",
                    )}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
              <SheetClose asChild>
                <Button asChild className="mt-3 h-12">
                  <Link href="/post">{t("nav.post")}</Link>
                </Button>
              </SheetClose>
              <div className="px-3 py-3">
                <LanguageSwitch />
              </div>
              {mobileAuth ? <div className="mt-1 flex flex-col gap-2 px-3">{mobileAuth}</div> : null}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
