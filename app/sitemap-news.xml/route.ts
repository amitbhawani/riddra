function buildEmptyNewsSitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- News detail pages are intentionally excluded from sitemap discovery under the current SEO policy. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
}

export async function GET() {
  return new Response(buildEmptyNewsSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
