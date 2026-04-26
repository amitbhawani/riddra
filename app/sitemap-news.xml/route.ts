import { getPublishedGoogleNewsSitemapEntries } from "@/lib/market-news/queries";
import { getPublicSiteUrl } from "@/lib/public-site-url";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildKeywordValue(entry: {
  keywords: string[];
  entity_names: string[];
  entity_symbols: string[];
}) {
  return Array.from(
    new Set(
      [...entry.keywords, ...entry.entity_names, ...entry.entity_symbols]
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  )
    .slice(0, 12)
    .join(", ");
}

export async function GET() {
  const siteUrl = getPublicSiteUrl();
  const entries = await getPublishedGoogleNewsSitemapEntries(48).catch(() => []);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Mirrors Google News sitemap behavior: recent news only, publication metadata, and clean article URLs. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map((entry) => {
    const loc = `${siteUrl}/markets/news/${entry.slug}`;
    const keywordValue = buildKeywordValue(entry);

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Riddra</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(entry.published_at)}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
${keywordValue ? `      <news:keywords>${escapeXml(keywordValue)}</news:keywords>` : ""}
    </news:news>
${entry.image_url ? `    <image:image>
      <image:loc>${escapeXml(entry.image_url)}</image:loc>
    </image:image>` : ""}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
