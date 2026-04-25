import type { Metadata } from "next";
import Link from "next/link";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";
import { getWealthFamilyOverviews, wealthFamilyMeta, wealthProducts } from "@/lib/wealth-products";

export const metadata: Metadata = {
  title: "Wealth Products",
  description: "Riddra wealth hub for ETFs, PMS, AIF, SIF, and investor-first product discovery.",
};

export default function WealthHubPage() {
  if (isStockFirstLaunchPlaceholderFamily("wealth")) {
    return (
      <StockFirstLaunchPlaceholderPage
        family="wealth"
        pageCategory="home"
      />
    );
  }

  const familyCounts = getWealthFamilyOverviews();
  const totalProducts = wealthProducts.length;

  return (
      <GlobalSidebarPageShell
        category="home"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <div className="space-y-5">
          <Eyebrow>Wealth expansion</Eyebrow>
          <SectionHeading
            title="Wealth product hub"
            description="Explore wealth-product families beyond stocks, IPOs, and mutual funds, with each route tuned for a different investor need and decision style."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Wealth truth"
          title="This wealth hub is useful for discovery, but deeper continuity still depends on launch activation"
          description="Use the wealth-product hub confidently for public exploration, while keeping auth continuity, premium access promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry wealth discovery into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full wealth-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium wealth-product language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for public wealth users who convert."
          supportPending="Support delivery is still not fully active, so the wealth hub should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          stats={[
            { label: "Tracked wealth routes", value: totalProducts },
            { label: "Family coverage", value: `${Object.keys(wealthFamilyMeta).length} families` },
            { label: "Coverage posture", value: "Broader seeded bench" },
            {
              label: "Support continuity",
              value: "Investor-safe follow-through",
              detail:
                "Wealth discovery now stays anchored to the same account, billing, and support posture as the rest of the public product.",
            },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {familyCounts.map((family) => (
            <Link key={family.href} href={family.href}>
              <GlowCard className="h-full transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{family.label}</h2>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{family.description}</p>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {family.count} products
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Role in platform</p>
                  <p className="mt-2 text-sm font-semibold text-white">{family.status}</p>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Entry and status mix</p>
                    <p className="mt-2 text-sm font-semibold text-white">{family.ticketSummary}</p>
                    <p className="mt-2 text-sm text-mist/68">{family.statusSummary}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Compare lanes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {family.compareHighlights.map((lane) => (
                        <span
                          key={lane}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-mist/78"
                        >
                          {lane}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </GlobalSidebarPageShell>
  );
}
