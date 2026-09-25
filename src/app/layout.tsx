import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  metadataBase: new URL("https://northernwork.com"),
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
    url: "https://northernwork.com",
    siteName: "Northernwork",
    locale: "en_CA",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-CA"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MarketplaceProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </MarketplaceProvider>
      </body>
    </html>
  );
}
