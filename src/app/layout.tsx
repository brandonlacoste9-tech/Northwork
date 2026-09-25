import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AuthNav } from "@/components/auth-nav";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale";
import { MarketplaceProvider } from "@/lib/marketplace";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://northernwork.ca"),
  title: {
    default: "Northernwork",
    template: "%s · Northernwork",
  },
  description:
    "Northernwork is a freelance marketplace for clients and freelancers in Canada. Rates in CAD. Remote means remote inside Canada.",
  applicationName: "Northernwork",
  openGraph: {
    title: "Northernwork",
    description:
      "A freelance marketplace for clients and freelancers in Canada.",
    url: "https://northernwork.ca",
    siteName: "Northernwork",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "https://northernwork.ca/og-image.jpg",
        width: 2192,
        height: 1152,
        alt: "Northernwork — Le marché freelance du Canada. Canada's freelance marketplace.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Northernwork",
    description:
      "A freelance marketplace for clients and freelancers in Canada.",
    images: ["https://northernwork.ca/og-image.jpg"],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale === "fr" ? "fr-CA" : "en-CA"}
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale}>
          <MarketplaceProvider>
            <SiteHeader desktopAuth={<AuthNav />} mobileAuth={<AuthNav stacked />} />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </MarketplaceProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
