import type { Metadata } from "next";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBulletListCard,
  ProductCard,
  ProductPageShell,
  ProductSectionTitle,
} from "@/components/product-page-system";

export const metadata: Metadata = {
  title: "R Score Methodology",
  description: "How the route-level R Score is calculated on the temporary stock prototype.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RScoreMethodologyPage() {
  const sidebar = await getGlobalSidebarRail("stocks");

  return (
    <ProductPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Stocks", href: "/stocks" },
        { label: "R Score Methodology", href: "/stocks/r-score-methodology" },
      ]}
      hero={
        <ProductCard tone="primary" className="space-y-4">
          <div className="space-y-2">
            <span className="riddra-product-body inline-flex rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.05)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#1B3A6B]">
              Temporary prototype methodology
            </span>
            <h1 className="riddra-product-display text-[1.8rem] font-semibold tracking-tight text-[#1B3A6B] sm:text-[2.2rem]">
              R Score Methodology
            </h1>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.9)]">
              The R Score on the test stock page is a route-level composite. It is not a brokerage recommendation, and it does not replace official analyst coverage. It simply compresses the current route signals into one readable number.
            </p>
          </div>
        </ProductCard>
      }
      stickyTabs={null}
      sidebar={sidebar}
      summary={
        <div className="grid gap-4 lg:grid-cols-2">
          <ProductBulletListCard
            title="Inputs currently used"
            description="The first version of the score only uses data already connected on the page."
            eyebrow="Inputs"
            variant="checklist"
            items={[
              { title: "Momentum", body: "The route reads retained price performance, especially the one-year move against the benchmark." },
              { title: "Quality", body: "ROE and ROCE are used as the first quality anchors where the fundamentals lane is connected." },
              { title: "Ownership", body: "Promoter ownership and combined FII plus DII ownership help the score reflect confidence from long-term holders." },
              { title: "Coverage confidence", body: "The score also rewards pages where fundamentals, shareholding, and retained history are actually connected." },
            ]}
          />
          <ProductBulletListCard
            title="How to read it"
            description="The score is meant to orient the user quickly, not to make the decision for them."
            eyebrow="Interpretation"
            variant="context"
            items={[
              { title: "75 and above", body: "Stronger route posture. Momentum, coverage, and quality signals are mostly supportive." },
              { title: "60 to 74", body: "Constructive posture. Enough strength exists to justify deeper research, but not without checking the details." },
              { title: "45 to 59", body: "Watchlist posture. Mixed signals mean the stock deserves context before conviction." },
              { title: "Below 45", body: "Cautious posture. The route is surfacing weak quality, weak momentum, or limited data confidence." },
            ]}
          />
          <ProductCard tone="secondary" className="space-y-3 lg:col-span-2">
            <ProductSectionTitle
              title="Important limitations"
              description="This methodology is intentionally narrow because the prototype should stay honest about what it knows."
              eyebrow="Limits"
            />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "The score is not analyst consensus and should not be shown as one.",
                "Missing data should reduce confidence rather than get replaced with invented values.",
                "As more official coverage is connected, the formula can expand without changing the page structure.",
              ].map((item) => (
                <div key={item} className="rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">{item}</p>
                </div>
              ))}
            </div>
          </ProductCard>
        </div>
      }
    />
  );
}
