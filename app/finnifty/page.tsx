import type { Metadata } from "next";

import { IndexDetailStandardPage } from "@/components/index-detail-standard-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("finnifty").catch(() => null);

  return buildManagedRouteMetadata({
    family: "indices",
    slug: "finnifty",
    title: index?.title ?? "Fin Nifty",
    summary:
      index?.narrative ??
      "Riddra Fin Nifty intelligence page for weighted breadth and financial-services sentiment.",
    symbol: index?.shortName ?? "FinNifty",
    publicHref: "/finnifty",
    benchmarkMapping: null,
  });
}

export default function FinNiftyPage() {
  return <IndexDetailStandardPage slug="finnifty" />;
}
