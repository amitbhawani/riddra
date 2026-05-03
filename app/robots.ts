import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/public-site-url";
import { seoRobotsAllowPaths, seoRobotsDisallowPaths } from "@/lib/seo-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = getPublicSiteUrl();

  return {
      rules: {
      userAgent: "*",
      allow: [...seoRobotsAllowPaths],
      disallow: [...seoRobotsDisallowPaths, "/auth/callback", "/build-tracker", "/launch-readiness", "/source-readiness"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
