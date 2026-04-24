import type { Metadata } from "next";
import Link from "next/link";

import { signoutAction } from "@/app/(auth)/actions";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { UserBookmarkPanel } from "@/components/user-bookmark-panel";
import { UserPortfolioPanel } from "@/components/user-portfolio-panel";
import { UserProfileSettingsCard } from "@/components/user-profile-settings-card";
import { UserWatchlistPanel } from "@/components/user-watchlist-panel";
import { ButtonLink, Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import {
  getAdminRowsForFamilies,
  memberFacingAdminFamilies,
} from "@/lib/admin-content-registry";
import type { AdminListRow } from "@/lib/admin-content-schema";
import {
  type AdminMembershipTier,
  getAdminMembershipTiers,
  getAdminOperatorStore,
} from "@/lib/admin-operator-store";
import { getUserSubscriptionSummary } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import {
  getMembershipFeatureSummaryForProfile,
  getUserBookmarks,
  getUserPortfolioHoldings,
  getUserProductProfile,
  getUserRecentlyViewed,
  getUserWatchlist,
} from "@/lib/user-product-store";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Riddra dashboard for watchlists, portfolio tracking, and membership access.",
};

function parseTokens(value: string[]) {
  return value.map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function matchesRecordToken(tokens: string[], row: AdminListRow) {
  const slugToken = row.slug.toLowerCase();
  const familyToken = `${row.family}:${row.slug}`.toLowerCase();
  const routeToken = row.publicHref?.toLowerCase();
  return tokens.some((token) => token === slugToken || token === familyToken || token === routeToken);
}

function buildTierRuleSet(tier: AdminMembershipTier | null) {
  return {
    includedTokens: parseTokens(tier?.includedRecords ?? []),
    excludedTokens: parseTokens(tier?.excludedRecords ?? []),
    includedFamilies: new Set(tier?.includedFamilies ?? []),
  };
}

function tierAllowsRow(
  row: AdminListRow,
  membershipTier: string | null,
  tier: AdminMembershipTier | null,
  tierRules: ReturnType<typeof buildTierRuleSet>,
) {
  if (row.accessMode === "hidden_internal" || row.accessMode === "purchased_enrolled") {
    return false;
  }

  if (row.accessMode === "public_free" || row.accessMode === "logged_in_free_member") {
    return true;
  }

  if (row.accessMode === "coming_soon_registration_required") {
    return false;
  }

  const normalizedTier = membershipTier?.trim().toLowerCase() ?? "";

  if (!tier || !normalizedTier) {
    return row.accessMode !== "membership_tiers";
  }

  if (matchesRecordToken(tierRules.excludedTokens, row)) {
    return false;
  }

  if (matchesRecordToken(tierRules.includedTokens, row)) {
    return true;
  }

  if (tierRules.includedFamilies.has(row.family)) {
    return true;
  }

  if (row.accessMode === "membership_tiers") {
    return row.allowedMembershipTiers.some(
      (allowedTier) => allowedTier.trim().toLowerCase() === normalizedTier,
    );
  }

  return true;
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Awaiting quotes";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Recently active";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatFeatureLabel(key: string) {
  switch (key) {
    case "stocks_basic":
      return "Stock basics";
    case "stocks_forecasts":
      return "Forecasts";
    case "mutual_funds_basic":
      return "Fund basics";
    case "portfolio_tools":
      return "Portfolio tools";
    case "research_access":
      return "Research";
    case "courses_access":
      return "Courses and webinars";
    case "premium_analytics":
      return "Premium analytics";
    default:
      return key;
  }
}

function formatPageTypeLabel(value: string) {
  switch (value) {
    case "mutual_fund":
      return "Mutual fund";
    case "index":
      return "Index";
    case "learn":
    case "research":
      return "Learn";
    default:
      return "Stock";
  }
}

function getLockedContentMessage(row: AdminListRow, currentTierName: string) {
  if (row.accessMode === "coming_soon_registration_required") {
    return {
      reason: "This item is not open yet. It will unlock when registration or the first release window goes live.",
      ctaLabel: "Browse what is live",
      ctaHref: "/learn",
    };
  }

  if (row.accessMode === "membership_tiers") {
    return {
      reason: row.allowedMembershipTiers.length
        ? `Included on ${row.allowedMembershipTiers.join(", ")}. You are currently on ${currentTierName}.`
        : `This item needs a higher access level than your current ${currentTierName} membership.`,
      ctaLabel: "See membership options",
      ctaHref: "/pricing",
    };
  }

  if (row.accessMode === "purchased_enrolled") {
    return {
      reason: "This item needs enrollment or purchase. Your current membership on its own does not unlock it.",
      ctaLabel: "Get help with access",
      ctaHref: "/contact",
    };
  }

  return {
    reason: row.accessDetail || "This item is not available in your current access level yet.",
    ctaLabel: "See membership options",
    ctaHref: "/pricing",
  };
}

export default async function AccountPage() {
  const user = await requireUser();
  const [subscription, profile, watchlistItems, portfolioHoldings, bookmarks, recentlyViewed, store, tiers, sharedSidebarRailData] =
    await Promise.all([
      getUserSubscriptionSummary(user),
      getUserProductProfile(user),
      getUserWatchlist(user),
      getUserPortfolioHoldings(user),
      getUserBookmarks(user),
      getUserRecentlyViewed(user),
      getAdminOperatorStore(),
      getAdminMembershipTiers(),
      getSharedSidebarRailData({ pageCategory: "account" }),
    ]);
  const allRows = await getAdminRowsForFamilies(memberFacingAdminFamilies, store.records, {
    cacheKey: store.updatedAt,
  });

  const currentTierSlug = profile.membershipTier || "free";
  const currentTier =
    tiers.find((tier) => tier.slug === currentTierSlug) ?? null;
  const currentTierName = currentTier?.name || currentTierSlug;
  const tierRules = buildTierRuleSet(currentTier);
  const membershipFeatureSummary = await getMembershipFeatureSummaryForProfile(profile);

  const accessibleRows = allRows.filter((row) =>
    tierAllowsRow(row, profile.membershipTier, currentTier, tierRules),
  );
  const lockedRows = allRows.filter(
    (row) => !tierAllowsRow(row, profile.membershipTier, currentTier, tierRules),
  );
  const unlockedHighlights = accessibleRows
    .filter((row) =>
      ["courses", "webinars", "learn", "newsletter", "research-articles"].includes(row.family),
    )
    .slice(0, 4);
  const lockedHighlights = lockedRows
    .filter((row) => row.accessMode !== "hidden_internal")
    .slice(0, 4);
  const stockWatchlistCount = watchlistItems.filter((item) => item.pageType === "stock").length;
  const mutualFundWatchlistCount = watchlistItems.filter(
    (item) => item.pageType === "mutual_fund",
  ).length;

  const investedTotal = portfolioHoldings.reduce(
    (sum, holding) => sum + holding.investedValue,
    0,
  );
  const allHoldingsPriced = portfolioHoldings.every(
    (holding) => holding.currentValue !== null,
  );
  const currentTotal = portfolioHoldings.length
    ? portfolioHoldings.reduce(
        (sum, holding) => sum + (holding.currentValue ?? holding.investedValue),
        0,
      )
    : 0;
  const pnlTotal = portfolioHoldings.length
    ? portfolioHoldings.reduce(
        (sum, holding) => sum + (holding.pnlValue ?? 0),
        0,
      )
    : 0;
  const planStatus = subscription
    ? `${subscription.planCode} • ${subscription.status}`
    : "Free member access is active";

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Eyebrow>Your account</Eyebrow>
          <SectionHeading
            title="Member dashboard"
            description="Track your watchlist, review your portfolio, and see exactly what your current Riddra access unlocks."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-[rgba(75,85,99,0.84)]">Membership status</p>
            <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
              {currentTierName}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {planStatus}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-[rgba(75,85,99,0.84)]">Watchlist summary</p>
            <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
              {watchlistItems.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {watchlistItems.length
                ? `${stockWatchlistCount} stocks and ${mutualFundWatchlistCount} mutual funds saved for quick revisit.`
                : "Start a shortlist of stocks and mutual funds you want to revisit often."}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-[rgba(75,85,99,0.84)]">Portfolio value</p>
            <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
              {portfolioHoldings.length ? formatCurrency(currentTotal) : "No holdings yet"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {portfolioHoldings.length
                ? `Invested ${formatCurrency(investedTotal)} • ${pnlTotal >= 0 ? "Gain" : "Loss"} ${formatCurrency(Math.abs(pnlTotal))}`
                : "Add your holdings to track invested value and P&L."}
              {portfolioHoldings.length && !allHoldingsPriced ? " • some quotes still loading" : ""}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-[rgba(75,85,99,0.84)]">Access right now</p>
            <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
              {membershipFeatureSummary.totalEnabled}/{membershipFeatureSummary.totalAvailable}
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {lockedRows.length
                ? `${lockedRows.length} tracked items still need a higher tier, registration, or enrollment.`
                : "Your current tracked member library is fully unlocked right now."}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <GlowCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#1B3A6B]">Membership and access</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  See what your current membership unlocks and which content is still behind a higher tier or registration wall.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/account/watchlists" tone="secondary">
                  Open watchlists
                </ButtonLink>
                <ButtonLink href="/portfolio" tone="secondary">
                  Open portfolio
                </ButtonLink>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#1B3A6B]">Unlocked for you</p>
                  <span className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium text-[#1B3A6B]">
                    {accessibleRows.length} available now
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  Your current membership is <span className="font-medium text-[#1B3A6B]">{currentTierName}</span>. These are ready to open right away.
                </p>
                <div className="mt-3 space-y-3">
                  {unlockedHighlights.length ? (
                    unlockedHighlights.map((row) => (
                      <div key={`${row.family}-${row.slug}`} className="rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-[#f8fafc] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#1B3A6B]">{row.title}</p>
                            <p className="mt-1 text-xs text-[rgba(107,114,128,0.88)]">
                              {row.familyLabel} • {row.accessLabel}
                            </p>
                          </div>
                          {row.publicHref ? (
                            <Link href={row.publicHref} className="text-xs font-medium text-[#1B3A6B] underline">
                              Open
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                      Your unlocked library will appear here as content and memberships expand.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#1B3A6B]">Still locked</p>
                  <span className="rounded-full border border-[rgba(212,133,59,0.22)] bg-[rgba(255,250,244,0.96)] px-3 py-1 text-[11px] font-medium text-[#D4853B]">
                    {lockedRows.length} need action
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  Locked items explain why they are unavailable and the clearest next step to unlock or follow them.
                </p>
                <div className="mt-3 space-y-3">
                  {lockedHighlights.length ? (
                    lockedHighlights.map((row) => {
                      const lockMessage = getLockedContentMessage(row, currentTierName);
                      return (
                      <div key={`${row.family}-${row.slug}`} className="rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-[#fffaf4] px-3 py-3">
                        <p className="text-sm font-semibold text-[#1B3A6B]">{row.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
                          {row.familyLabel} • {row.accessLabel}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                          {lockMessage.reason}
                        </p>
                        <div className="mt-3">
                          <Link href={lockMessage.ctaHref} className="text-sm font-medium text-[#1B3A6B] underline">
                            {lockMessage.ctaLabel}
                          </Link>
                        </div>
                      </div>
                    );
                    })
                  ) : (
                    <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                      You currently have access to everything in the tracked member-facing library.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-[#1B3A6B]">Profile and session</h2>
            <div className="mt-4 grid gap-3">
              <UserProfileSettingsCard profile={profile} />
              <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Name</p>
                <p className="mt-1 text-lg font-semibold text-[#1B3A6B]">{profile.name}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Public profile</p>
                <p className="mt-1 text-lg font-semibold text-[#1B3A6B]">@{profile.username}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  Safe profile page with watchlist, portfolio summary, bookmarks, and recent activity.
                </p>
              </div>
              <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Email</p>
                <p className="mt-1 text-lg font-semibold text-[#1B3A6B]">{profile.email}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Last active</p>
                <p className="mt-1 text-lg font-semibold text-[#1B3A6B]">{formatDateTime(profile.lastActiveAt)}</p>
              </div>
              {currentTier ? (
                <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                  <p className="text-sm text-[rgba(75,85,99,0.84)]">Tier note</p>
                  <p className="mt-1 text-sm leading-7 text-[#1B3A6B]">{currentTier.description}</p>
                </div>
              ) : null}
              <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[rgba(75,85,99,0.84)]">Membership features</p>
                  <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium text-[#1B3A6B]">
                    {membershipFeatureSummary.totalEnabled}/{membershipFeatureSummary.totalAvailable} enabled
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {membershipFeatureSummary.enabled.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium text-[#1B3A6B]"
                    >
                      {formatFeatureLabel(feature)}
                    </span>
                  ))}
                </div>
                {membershipFeatureSummary.disabled.length ? (
                  <p className="mt-3 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                    Still locked: {membershipFeatureSummary.disabled.map(formatFeatureLabel).join(", ")}.
                    <Link href={currentTier?.ctaHref || "/pricing"} className="ml-1 font-medium text-[#1B3A6B] underline">
                      {currentTier?.ctaLabel || "See upgrade options"}
                    </Link>
                  </p>
                ) : null}
              </div>
              <form action={signoutAction} className="pt-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-5 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#1B3A6B]">Your watchlist</h2>
                <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  Add stocks you want to revisit quickly and open them straight from your account.
                </p>
              </div>
              <Link href="/account/watchlists" className="text-sm font-medium text-[#1B3A6B] underline">
                Full view
              </Link>
            </div>
            <div className="mt-5">
              <UserWatchlistPanel initialItems={watchlistItems} mode="summary" />
            </div>
          </GlowCard>

          <GlowCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#1B3A6B]">Portfolio snapshot</h2>
                <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  Track invested value, live value, and P&amp;L without leaving your dashboard.
                </p>
              </div>
              <Link href="/portfolio" className="text-sm font-medium text-[#1B3A6B] underline">
                Full view
              </Link>
            </div>
            <div className="mt-5">
              <UserPortfolioPanel initialHoldings={portfolioHoldings} mode="summary" />
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#1B3A6B]">Bookmarks</h2>
                <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  Keep the public pages you want to revisit most without rebuilding the path each time.
                </p>
              </div>
              <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium text-[#1B3A6B]">
                {bookmarks.length} saved
              </span>
            </div>
            <div className="mt-5">
              <UserBookmarkPanel initialItems={bookmarks} mode="summary" />
            </div>
          </GlowCard>

          <GlowCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#1B3A6B]">Recently viewed</h2>
                <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  Jump back into the pages you opened most recently without searching again.
                </p>
              </div>
              <span className="rounded-full border border-[rgba(212,133,59,0.18)] bg-[rgba(255,250,244,0.96)] px-3 py-1 text-[11px] font-medium text-[#D4853B]">
                {recentlyViewed.length} recent
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {recentlyViewed.length ? (
                recentlyViewed.slice(0, 4).map((item) => (
                  <div
                    key={`${item.pageType}-${item.slug}`}
                    className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1B3A6B]">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
                          {formatPageTypeLabel(item.pageType)} • Viewed {formatDateTime(item.viewedAt)}
                        </p>
                      </div>
                      <Link href={item.href} className="text-sm font-medium text-[#1B3A6B] underline">
                        Open page
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-5 py-6">
                  <p className="text-sm font-medium text-[#1B3A6B]">Nothing in recent history yet</p>
                  <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    Open a stock, fund, index, or learn page while signed in and it will appear here.
                  </p>
                </div>
              )}
            </div>
          </GlowCard>
        </div>

          </div>

          {sharedSidebarRailData.enabledOnPageType ? (
            <aside className="space-y-4 xl:sticky xl:top-24">
              <SharedMarketSidebarRail
                visibleBlocks={sharedSidebarRailData.visibleBlocks}
                marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
                topGainers={sharedSidebarRailData.topGainers}
                topLosers={sharedSidebarRailData.topLosers}
                popularStocks={sharedSidebarRailData.popularStocks}
              />
            </aside>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
