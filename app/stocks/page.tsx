import type { Metadata } from "next";

import { StocksIndexPageServer } from "@/components/stocks-index-page-server";
import { buildSeoMetadata } from "@/lib/seo-config";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    policyKey: "stocks_hub",
    title: "Indian Stocks | Riddra",
    description:
      "Browse Indian stocks with quote snapshots, sector context, and direct links into detailed research pages.",
    publicHref: "/stocks",
  });
}

export default async function StocksIndexPage() {
  return <StocksIndexPageServer currentPage={1} />;
}
