import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { UserWatchlistPanel } from "@/components/user-watchlist-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getUserWatchlist } from "@/lib/user-product-store";
import { buildWatchlistDisplayItems } from "@/lib/user-watchlist-view";

export const metadata: Metadata = {
  title: "Watchlists",
  description: "Manage your saved stocks and mutual funds and quickly jump back into the pages you track most.",
};

export const dynamic = "force-dynamic";

export default async function AccountWatchlistsPage() {
  const user = await requireUser();
  const watchlist = await getUserWatchlist(user);
  const watchlistDisplayItems = await buildWatchlistDisplayItems(watchlist);
  const stockCount = watchlist.filter((item) => item.pageType === "stock").length;
  const mutualFundCount = watchlist.filter((item) => item.pageType === "mutual_fund").length;

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Account", href: "/account" },
              { name: "Watchlists", href: "/account/watchlists" },
            ]}
          />
          <Eyebrow>Personal tracking</Eyebrow>
          <SectionHeading
            title="Your watchlists"
            description="Keep your important stocks and mutual funds in one place, jump back into their pages quickly, and remove names once you are done tracking them."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <GlowCard className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgba(75,85,99,0.68)]">
              Tracked items
            </p>
            <p className="text-2xl font-semibold text-[#1B3A6B]">{watchlist.length}</p>
            <p className="text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Across your saved market names.
            </p>
          </GlowCard>
          <GlowCard className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgba(75,85,99,0.68)]">
              Stocks
            </p>
            <p className="text-2xl font-semibold text-[#1B3A6B]">{stockCount}</p>
            <p className="text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Best for daily price and range review.
            </p>
          </GlowCard>
          <GlowCard className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgba(75,85,99,0.68)]">
              Mutual funds
            </p>
            <p className="text-2xl font-semibold text-[#1B3A6B]">{mutualFundCount}</p>
            <p className="text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Keep NAV and benchmark context nearby.
            </p>
          </GlowCard>
          <GlowCard className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[rgba(75,85,99,0.68)]">
              Best use
            </p>
            <p className="text-2xl font-semibold text-[#1B3A6B]">Daily review</p>
            <p className="text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              Move owned names to portfolio when conviction is real.
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-[#1B3A6B]">Watchlist manager</h2>
              <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                Add by stock symbol, stock slug, or mutual fund name, then open or remove items directly from the list below.
              </p>
            </div>
            <Link href="/account" className="text-sm font-medium text-[#1B3A6B] underline">
              Back to account
            </Link>
          </div>

          <div className="mt-5">
            <UserWatchlistPanel initialItems={watchlistDisplayItems} />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
