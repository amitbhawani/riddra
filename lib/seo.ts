import { getPublicSiteUrl } from "@/lib/public-site-url";
import { siteConfig } from "@/lib/site";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  const siteUrl = getPublicSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.href}`,
    })),
  };
}

export function buildWebPageSchema({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const siteUrl = getPublicSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${siteUrl}${path}`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteUrl,
    },
  };
}

export function stringifySchema(data: unknown) {
  return JSON.stringify(data);
}
