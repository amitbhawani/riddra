import type { Metadata } from "next";

import { IndexDetailRoutePage } from "@/components/index-detail-brief-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("finnifty");

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
  return <IndexDetailRoutePage slug="finnifty" />;
}
