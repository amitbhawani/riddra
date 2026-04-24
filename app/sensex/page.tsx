import type { Metadata } from "next";

import { IndexDetailRoutePage } from "@/components/index-detail-brief-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("sensex");

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
  return <IndexDetailRoutePage slug="sensex" />;
}
