import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account/",
        "/auth/callback",
        "/api/",
        "/build-tracker",
        "/launch-readiness",
        "/source-readiness",
      ],
    },
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap-news.xml`],
  };
}
