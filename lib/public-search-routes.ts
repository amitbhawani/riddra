import { getPublicStockDiscoverySlugs } from "@/lib/content";
import { filterEntriesToPublishableCms } from "@/lib/publishable-content";

function extractCanonicalStockSlugFromHref(href: string) {
  const normalizedHref = href.trim().toLowerCase();
  const match = normalizedHref.match(/^\/stocks\/([^/]+)(?:\/chart)?$/);

  if (!match) {
    return null;
  }

  return match[1] ?? null;
}

export async function filterEntriesToPublicSearchRoutes<T extends { href: string }>(
  entries: readonly T[],
): Promise<T[]> {
  const [publishableEntries, canonicalStockSlugs] = await Promise.all([
    filterEntriesToPublishableCms(entries),
    getPublicStockDiscoverySlugs(),
  ]);
  const publishableHrefSet = new Set(publishableEntries.map((entry) => entry.href));
  const canonicalSlugSet = new Set(canonicalStockSlugs);

  return entries.filter((entry) => {
    if (publishableHrefSet.has(entry.href)) {
      return true;
    }

    const stockSlug = extractCanonicalStockSlugFromHref(entry.href);
    return stockSlug ? canonicalSlugSet.has(stockSlug) : false;
  });
}
