import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

import { RootRouteShell } from "@/components/root-route-shell";
import { getLaunchState } from "@/lib/launch-state";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { siteConfig } from "@/lib/site";
import { getSiteChromeConfig } from "@/lib/site-experience";
import { normalizeSystemHeadCode } from "@/lib/system-head-code";
import { getSystemSettings } from "@/lib/user-product-store";

import "./globals.css";

export const revalidate = 300;

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
  const settings = await getSystemSettings();
  const runtimeConfig = getRuntimeLaunchConfig();
  const publicHeadCode = normalizeSystemHeadCode(
    runtimeConfig.headerHeadCode || settings.publicHeadCode,
  );
  const siteChrome = getSiteChromeConfig();
  const launchState = getLaunchState();

  return (
    <html lang="en">
      <head />
      <body className={`${riddraBodyFont.variable} ${riddraDisplayFont.variable} ${riddraMonoFont.variable} antialiased`}>
        <RootRouteShell
          publicHeadCode={publicHeadCode}
          siteChrome={siteChrome}
          launchLabel={launchState.label}
        >
          {children}
        </RootRouteShell>
      </body>
    </html>
  );
}
