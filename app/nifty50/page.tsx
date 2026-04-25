import type { Metadata } from "next";

import { IndexDetailStandardPage } from "@/components/index-detail-standard-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("nifty50");

  return buildManagedRouteMetadata({
    family: "indices",
    slug: "nifty50",
    title: index?.title ?? "Nifty 50",
    summary:
      index?.narrative ??
      "Riddra Nifty 50 index intelligence page for weighted breadth and market mood.",
    symbol: index?.shortName ?? "Nifty50",
    publicHref: "/nifty50",
    benchmarkMapping: null,
  });
}

export default function Nifty50Page() {
  return <IndexDetailStandardPage slug="nifty50" />;
}
