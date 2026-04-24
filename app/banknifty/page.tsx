import type { Metadata } from "next";

import { IndexDetailRoutePage } from "@/components/index-detail-brief-page";
import { getIndexSnapshot } from "@/lib/index-content";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const index = await getIndexSnapshot("banknifty");

  return buildManagedRouteMetadata({
    family: "indices",
    slug: "banknifty",
    title: index?.title ?? "Bank Nifty",
    summary:
      index?.narrative ??
      "Riddra Bank Nifty intelligence page for weighted breadth and banking sentiment.",
    symbol: index?.shortName ?? "BankNifty",
    publicHref: "/banknifty",
    benchmarkMapping: null,
  });
}

export default function BankNiftyPage() {
  return <IndexDetailRoutePage slug="banknifty" />;
}
