"use client";

import Link from "next/link";
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

export function SiteHeader({ authNav }: { authNav?: React.ReactNode }) {
  const t = useT();
  const links = [
    { href: "/talent", label: t("nav.talent") },
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/messages", label: t("nav.messages") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Northernwork home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/post">{t("nav.post")}</Link>
          </Button>
          <LanguageSwitch />
          {authNav}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
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
                    className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
              <SheetClose asChild>
                <Button asChild className="mt-3 h-11">
                  <Link href="/post">{t("nav.post")}</Link>
                </Button>
              </SheetClose>
              <div className="px-3 py-2">
                <LanguageSwitch />
              </div>
              {authNav ? (
                <div className="mt-3 flex flex-col gap-1 px-3">{authNav}</div>
              ) : null}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
