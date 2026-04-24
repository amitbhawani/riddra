import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { UserPortfolioPanel } from "@/components/user-portfolio-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getUserPortfolioHoldings } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Track your current holdings, invested value, live value, and portfolio P&L in one place.",
};

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PortfolioPage() {
  const user = await requireUser();
  const [holdings, sharedSidebarRailData] = await Promise.all([
    getUserPortfolioHoldings(user),
    getSharedSidebarRailData({ pageCategory: "portfolio" }),
  ]);

  const investedTotal = holdings.reduce((sum, holding) => sum + holding.investedValue, 0);
  const currentTotal = holdings.reduce(
    (sum, holding) => sum + (holding.currentValue ?? holding.investedValue),
    0,
  );
  const pnlTotal = holdings.reduce((sum, holding) => sum + (holding.pnlValue ?? 0), 0);

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Account", href: "/account" },
              { name: "Portfolio", href: "/portfolio" },
            ]}
          />
          <Eyebrow>Portfolio tracking</Eyebrow>
          <SectionHeading
            title="Your portfolio"
            description="Review your holdings, update position sizes, and keep a clear view of invested capital, live value, and current profit or loss."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Current value</p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
                  {holdings.length ? formatCurrency(currentTotal) : "No holdings yet"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  Uses the latest available stock quotes where available.
                </p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Invested</p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{formatCurrency(investedTotal)}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  Your total entry value across all manually tracked positions.
                </p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">P&amp;L</p>
                <p className={`mt-2 text-2xl font-semibold ${pnlTotal >= 0 ? "text-[#166534]" : "text-[#b91c1c]"}`}>
                  {holdings.length ? formatCurrency(pnlTotal) : "₹0"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  A simple live snapshot built for quick review, not tax accounting.
                </p>
              </GlowCard>
            </div>

            <GlowCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B3A6B]">Portfolio holdings</h2>
                  <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    Add a holding, edit it inline, or remove it when you have exited the position.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/account" className="text-sm font-medium text-[#1B3A6B] underline">
                    Back to account
                  </Link>
                  <Link href="/portfolio/import" className="text-sm font-medium text-[#1B3A6B] underline">
                    Import portfolio
                  </Link>
                  <Link href="/account/watchlists" className="text-sm font-medium text-[#1B3A6B] underline">
                    Open watchlists
                  </Link>
                </div>
              </div>

              <div className="mt-5">
                <UserPortfolioPanel initialHoldings={holdings} />
              </div>
            </GlowCard>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            {sharedSidebarRailData.enabledOnPageType ? (
              <SharedMarketSidebarRail
                visibleBlocks={sharedSidebarRailData.visibleBlocks}
                marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
                topGainers={sharedSidebarRailData.topGainers}
                topLosers={sharedSidebarRailData.topLosers}
                popularStocks={sharedSidebarRailData.popularStocks}
              />
            ) : null}
                  <GlowCard className="space-y-3">
                    <p className="text-sm font-semibold text-[#1B3A6B]">Portfolio actions</p>
                    <div className="space-y-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                      <Link href="/portfolio/import" className="block font-medium text-[#1B3A6B] underline">
                        Import holdings from CSV
                      </Link>
                      <Link href="/account/watchlists" className="block font-medium text-[#1B3A6B] underline">
                        Open watchlists
                      </Link>
                      <Link href="/account" className="block font-medium text-[#1B3A6B] underline">
                        Return to account
                      </Link>
                    </div>
                  </GlowCard>
                ),
                workflow_checklist: (
                  <GlowCard className="space-y-3">
                    <p className="text-sm font-semibold text-[#1B3A6B]">Portfolio checklist</p>
                    <ul className="space-y-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                      <li>Review the quote-backed value before making decisions.</li>
                      <li>Use import when you have many holdings to add at once.</li>
                      <li>Keep your watchlist nearby for ideas you have not bought yet.</li>
                    </ul>
                  </GlowCard>
          </aside>
        </div>
      </Container>
    </div>
  );
}
