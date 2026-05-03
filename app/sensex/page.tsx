import type { Metadata } from "next";

import { IndexDetailStandardPage } from "@/components/index-detail-standard-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("sensex").catch(() => null);

  return buildManagedRouteMetadata({
    family: "indices",
    slug: "sensex",
    title: index?.title ?? "Sensex",
    summary:
      index?.narrative ??
      "Riddra Sensex intelligence page for weighted breadth and daily market tone.",
    symbol: index?.shortName ?? "Sensex",
    publicHref: "/sensex",
    benchmarkMapping: null,
  });
}

export default function SensexPage() {
  return <IndexDetailStandardPage slug="sensex" />;
}
