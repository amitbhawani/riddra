import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { REQUEST_PATH_HEADER } from "@/lib/open-access";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { siteConfig } from "@/lib/site";
import { normalizeSystemHeadCode } from "@/lib/system-head-code";
import { getSystemSettings } from "@/lib/user-product-store";

import "./globals.css";

const riddraBodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-riddra-body",
});

const riddraDisplayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-riddra-display",
});

const riddraMonoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-riddra-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getPublicSiteUrl();
  const settings = await getSystemSettings();
  const siteName = settings.siteName || "Riddra";
  const description = settings.defaultMetaDescription || siteConfig.description;
  const canonicalBase = settings.defaultCanonicalBase || siteUrl;
  const ogImage = settings.defaultOgImage || undefined;

  return {
    metadataBase: new URL(canonicalBase),
    title: {
      default: `${siteName} | Market Intelligence Platform`,
      template: `%s | ${settings.defaultMetaTitleSuffix || siteName}`,
    },
    description,
    robots: settings.defaultNoIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      title: siteName,
      description,
      url: siteUrl,
      siteName,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const route = requestHeaders.get(REQUEST_PATH_HEADER) ?? "/";
  const isAdminRoute = route === "/admin" || route.startsWith("/admin/");
  const settings = await getSystemSettings();
  const publicHeadCode = isAdminRoute ? "" : normalizeSystemHeadCode(settings.publicHeadCode);

  return (
    <html lang="en">
      {publicHeadCode ? (
        <head suppressHydrationWarning dangerouslySetInnerHTML={{ __html: publicHeadCode }} />
      ) : (
        <head />
      )}
      <body
        className={`${riddraBodyFont.variable} ${riddraDisplayFont.variable} ${riddraMonoFont.variable} ${isAdminRoute ? "bg-[#f3f4f6] text-[#111827]" : "bg-ink text-white"} antialiased`}
      >
        {isAdminRoute ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <div className="public-site-shell relative min-h-screen overflow-hidden [--site-top-row-height:56px] [--site-ticker-row-height:24px] [--site-header-offset:calc(var(--site-top-row-height)+var(--site-ticker-row-height))]">
            <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:42px_42px] opacity-[0.08]" />
            <SiteHeader />
            <main className="public-site-main relative pt-[var(--site-header-offset)]">{children}</main>
            <SiteFooter />
          </div>
        )}
        <Analytics />
      </body>
    </html>
  );
}
