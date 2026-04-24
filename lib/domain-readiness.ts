import { getConfiguredPublicSiteUrl } from "@/lib/public-site-url";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

function isProductionUrl(url: string) {
  return url.startsWith("https://") && !url.includes("localhost");
}

export function getDomainReadiness() {
  const config = getRuntimeLaunchConfig();
  const siteUrl = getConfiguredPublicSiteUrl();
  const productionLike = isProductionUrl(siteUrl);

  const items = [
    {
      title: "Primary site URL",
      status: productionLike ? "Ready" : "In progress",
      detail: productionLike
        ? `Primary site URL is configured as ${siteUrl}.`
        : `Primary site URL is currently ${siteUrl}, which suggests local or pre-launch use rather than final public launch.`,
    },
    {
      title: "Auth callback expectation",
      status: productionLike ? "Ready" : "In progress",
      detail: productionLike
        ? `Google and email auth should redirect back to ${siteUrl}/auth/callback after Supabase provider setup is completed.`
        : "Auth callback URLs still need a final production domain so provider redirects are not locked to local development.",
    },
    {
      title: "Public domain trust",
      status: productionLike ? "Ready" : "Blocked",
      detail: productionLike
        ? "The app has a production-like site URL, which is the right base for public trust pages, sitemap, and launch messaging."
        : "A final public domain or confirmed production URL still needs to be set before broad launch messaging is safe.",
    },
    {
      title: "Sitemap and metadata base",
      status: productionLike ? "Ready" : "Partial",
      detail: productionLike
        ? "Sitemap and metadata can now point at the final domain consistently."
        : "Sitemap and metadata structure exist, but the final public URL should be confirmed before launch promotion.",
    },
    {
      title: "Support and trust alignment",
      status: config.supportEmail ? "Ready" : "Blocked",
      detail: config.supportEmail
        ? `Support contact is configured as ${config.supportEmail}, so domain and trust surfaces can point users to a real destination.`
        : "Support contact is still missing, so even a correct public domain would still feel incomplete from a trust perspective.",
    },
  ];

  return {
    siteUrl,
    readyCount: items.filter((item) => item.status === "Ready").length,
    blockedCount: items.filter((item) => item.status === "Blocked").length,
    items,
  };
}
