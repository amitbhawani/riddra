import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getAccountBillingMemory } from "@/lib/billing-ledger-memory-store";
import { getEntitlementSyncMemory } from "@/lib/entitlement-sync-memory-store";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getPublicUserProfileByUsername, type ProductUserProfile } from "@/lib/user-product-store";

type PageProps = {
  params: Promise<{ username: string }>;
};

type MembershipAccent = {
  tierLabel: string;
  starClassName: string;
  chipClassName: string;
  ringClassName: string;
};

type PublicMembershipState = {
  slug: string;
  name: string;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicUserProfileByUsername(username);

  if (!data) {
    return {
      title: "User profile not found",
    };
  }

  return {
    title: `${data.profile.name} (@${data.profile.username})`,
    description: `${data.profile.name}'s public Riddra profile with membership tier, watchlist, portfolio summary, and saved pages.`,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string | null | undefined) {
  const parsed = Date.parse(value ?? "");

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(parsed));
}

function buildPublicProfileLinkItems(profile: ProductUserProfile) {
  const items: Array<{ label: string; href: string }> = [];

  if (profile.websiteUrl) {
    items.push({ label: "Website", href: profile.websiteUrl });
  }

  if (profile.xHandle) {
    items.push({ label: "X", href: `https://x.com/${profile.xHandle}` });
  }

  if (profile.linkedinUrl) {
    items.push({ label: "LinkedIn", href: profile.linkedinUrl });
  }

  if (profile.instagramHandle) {
    items.push({ label: "Instagram", href: `https://instagram.com/${profile.instagramHandle}` });
  }

  if (profile.youtubeUrl) {
    items.push({ label: "YouTube", href: profile.youtubeUrl });
  }

  return items;
}

function normalizeMembershipSlug(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "free";
}

function mapBillingPlanToMembershipSlug(planName: string | null | undefined) {
  const normalized = planName?.trim().toLowerCase() ?? "";

  if (normalized.includes("elite")) {
    return "pro-max";
  }

  if (normalized.includes("pro")) {
    return "pro";
  }

  return null;
}

function getMembershipNameForSlug(slug: string, fallback: string) {
  if (slug === "pro-max") {
    return "Pro Max";
  }

  if (slug === "pro") {
    return "Pro";
  }

  if (slug === "free") {
    return "Free";
  }

  return fallback;
}

function resolveEffectiveMembershipState(
  profile: ProductUserProfile,
  billingPlanName: string | null | undefined,
  fallbackName: string,
): PublicMembershipState {
  const billingSlug = mapBillingPlanToMembershipSlug(billingPlanName);

  if (billingSlug && profile.role === "admin") {
    return {
      slug: billingSlug,
      name: getMembershipNameForSlug(billingSlug, fallbackName),
    };
  }

  const profileSlug = normalizeMembershipSlug(profile.membershipTier);

  return {
    slug: profileSlug,
    name: getMembershipNameForSlug(profileSlug, fallbackName),
  };
}

function getMembershipAccent(membershipSlug: string): MembershipAccent | null {
  if (membershipSlug === "pro") {
    return {
      tierLabel: "Pro",
      starClassName: "text-[#94A3B8]",
      chipClassName:
        "border-[rgba(148,163,184,0.32)] bg-[rgba(148,163,184,0.12)] text-[#475569]",
      ringClassName:
        "border-[rgba(148,163,184,0.26)] bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(226,232,240,0.9)_100%)]",
    };
  }

  if (membershipSlug === "pro-max") {
    return {
      tierLabel: "Pro Max",
      starClassName: "text-[#D4A03B]",
      chipClassName:
        "border-[rgba(212,133,59,0.28)] bg-[rgba(212,133,59,0.12)] text-[#8E5723]",
      ringClassName:
        "border-[rgba(212,133,59,0.24)] bg-[linear-gradient(180deg,rgba(255,248,236,0.98)_0%,rgba(252,236,203,0.9)_100%)]",
    };
  }

  return null;
}

function resolveMembershipSinceLabel(
  effectiveMembershipSlug: string,
  profile: ProductUserProfile,
  billingMemory: {
    currentPlan: string;
    invoices: Array<{ planName: string; billedAt: string; paidAt: string }>;
  } | null,
  historyRows: Array<{ userRef: string; nextLevel: string; changedAt: string }>,
) {
  if (effectiveMembershipSlug !== "pro" && effectiveMembershipSlug !== "pro-max") {
    return null;
  }

  const billingPlanName = billingMemory?.currentPlan?.trim().toLowerCase() ?? "";
  const matchingInvoices =
    billingMemory?.invoices
      .filter((invoice) => invoice.planName.trim().toLowerCase() === billingPlanName)
      .map((invoice) => Date.parse(invoice.paidAt || invoice.billedAt))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right) ?? [];

  if (matchingInvoices.length > 0) {
    return formatDateLabel(new Date(matchingInvoices[0]).toISOString());
  }

  const expectedNextLevel = effectiveMembershipSlug === "pro-max" ? "elite" : "pro";
  const earliestMatch = historyRows
    .filter(
      (row) =>
        row.userRef.trim().toLowerCase() === profile.email.trim().toLowerCase() &&
        row.nextLevel.trim().toLowerCase() === expectedNextLevel,
    )
    .map((row) => Date.parse(row.changedAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)[0];

  if (earliestMatch) {
    return formatDateLabel(new Date(earliestMatch).toISOString());
  }

  return formatDateLabel(profile.createdAt);
}

function PublicProfileListItem({
  title,
  detail,
  href,
}: {
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <div className="public-profile-inline-card rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(27,58,107,0.035)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="riddra-product-body text-sm font-semibold text-[#1B3A6B]">{title}</p>
          <p className="riddra-product-body mt-1 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
            {detail}
          </p>
        </div>
        <Link
          href={href}
          className="public-profile-inline-action inline-flex h-8 items-center rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.03)] px-3 text-[12px] font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
        >
          Open page
        </Link>
      </div>
    </div>
  );
}

function EmptyCollection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="public-profile-empty-state rounded-[12px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-5 py-6">
      <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">{title}</p>
      <p className="riddra-product-body mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
        {description}
      </p>
    </div>
  );
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await getPublicUserProfileByUsername(username);

  if (!data) {
    notFound();
  }

  const pseudoUser = {
    id: data.profile.authUserId,
    email: data.profile.email,
  };

  const defaultEntitlementMemory: Pick<
    Awaited<ReturnType<typeof getEntitlementSyncMemory>>,
    "historyRows"
  > = {
    historyRows: [],
  };
  const defaultBillingMemory: Pick<
    Awaited<ReturnType<typeof getAccountBillingMemory>>,
    "currentPlan" | "invoices"
  > = {
    currentPlan: "",
    invoices: [],
  };
  const [sharedSidebarRailData, entitlementMemory, billingMemory] = await Promise.all([
    getSharedSidebarRailData({ pageCategory: "user_profiles" }),
    getEntitlementSyncMemory().catch(() => defaultEntitlementMemory),
    getAccountBillingMemory(pseudoUser).catch(() => defaultBillingMemory),
  ]);
  const showSharedSidebar = sharedSidebarRailData.enabledOnPageType;

  const investedTotal = data.portfolio.reduce((sum, holding) => sum + holding.investedValue, 0);
  const currentTotal = data.portfolio.reduce(
    (sum, holding) => sum + (holding.currentValue ?? holding.investedValue),
    0,
  );
  const stockWatchlistCount = data.watchlist.filter((item) => item.pageType === "stock").length;
  const mutualFundWatchlistCount = data.watchlist.filter(
    (item) => item.pageType === "mutual_fund",
  ).length;
  const fallbackMembershipName = data.membershipTier?.name ?? data.profile.membershipTier ?? "Free";
  const effectiveMembership = resolveEffectiveMembershipState(
    data.profile,
    billingMemory.currentPlan,
    fallbackMembershipName,
  );
  const membershipName = effectiveMembership.name;
  const membershipSlug = effectiveMembership.slug;
  const membershipAccent = getMembershipAccent(membershipSlug);
  const membershipSince = resolveMembershipSinceLabel(
    membershipSlug,
    data.profile,
    billingMemory,
    entitlementMemory.historyRows,
  );
  const membershipDescription =
    membershipSlug === "pro-max"
      ? "Full premium analytics and the broadest member product access."
      : membershipSlug === "pro"
        ? "Forecast-style guidance, premium learning, and stronger product access."
        : data.membershipTier?.description ?? "Basic public member profile access.";
  const publicLinkItems = buildPublicProfileLinkItems(data.profile);
  return (
    <div className="riddra-product-page py-6 sm:py-8">
      <Container>
        <div
          className={`grid gap-5 sm:gap-6 ${
            showSharedSidebar ? "xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start" : ""
          }`}
        >
          <div className="space-y-6 sm:space-y-7">
            <div className="space-y-3">
              <Eyebrow>Public profile</Eyebrow>
              <SectionHeading
                title="Member profile"
                description="Safe member-facing activity only. Watchlists, public holdings, and saved routes stay visible here without exposing private workspace controls."
              />
            </div>

            <GlowCard className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[34px]">
                        {data.profile.name}
                      </h1>
                      {membershipAccent ? (
                        <span
                          aria-label={`${membershipAccent.tierLabel} member`}
                          title={`${membershipAccent.tierLabel} member`}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl shadow-[0_10px_24px_rgba(27,58,107,0.08)] ${membershipAccent.ringClassName}`}
                        >
                          <span className={membershipAccent.starClassName}>★</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="riddra-product-body text-[15px] leading-7 text-[rgba(75,85,99,0.84)]">
                      @{data.profile.username} keeps a public Riddra profile with safe member-facing
                      activity, saved market pages, and shared portfolio context.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#1B3A6B]">
                      @{data.profile.username}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${membershipAccent?.chipClassName ?? "border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] text-[#1B3A6B]"}`}
                    >
                      {membershipAccent ? (
                        <span className={membershipAccent.starClassName} aria-hidden="true">
                          ★
                        </span>
                      ) : null}
                      {membershipName}
                    </span>
                    {membershipAccent && membershipSince ? (
                      <span className="public-profile-chip inline-flex items-center rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#1B3A6B]">
                        {membershipAccent.tierLabel} since {membershipSince}
                      </span>
                    ) : null}
                  </div>
                  {publicLinkItems.length ? (
                    <div className="flex flex-wrap gap-2">
                      {publicLinkItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.03)] px-3 py-1.5 text-[12px] font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.22)] hover:bg-[rgba(27,58,107,0.06)]"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/account"
                    className="public-profile-hero-action inline-flex h-10 items-center rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 text-sm font-medium text-[#1B3A6B] shadow-[0_10px_28px_rgba(27,58,107,0.04)] transition hover:bg-[rgba(27,58,107,0.03)]"
                  >
                    Open your account
                  </Link>
                  <Link
                    href="/account/watchlists"
                    className="public-profile-hero-action inline-flex h-10 items-center rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-4 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
                  >
                    Open watchlists
                  </Link>
                </div>
              </div>
            </GlowCard>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Membership tier</p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{membershipName}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  {membershipDescription}
                </p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">
                  {membershipAccent ? `${membershipAccent.tierLabel} since` : "Joined"}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
                  {membershipSince ?? formatDateLabel(data.profile.createdAt) ?? "Recently"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  {membershipAccent
                    ? `Public profile shows when this account entered the current ${membershipAccent.tierLabel} lane on record.`
                    : "Public member profile created date."}
                </p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Watchlist</p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{data.watchlist.length}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  {stockWatchlistCount} stocks and {mutualFundWatchlistCount} mutual funds saved.
                </p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-[rgba(75,85,99,0.84)]">Portfolio summary</p>
                <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">
                  {data.portfolio.length ? formatCurrency(currentTotal) : "No holdings shared"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                  {data.portfolio.length
                    ? `Invested ${formatCurrency(investedTotal)} across ${data.portfolio.length} holdings.`
                    : "Portfolio summary appears when holdings are tracked."}
                </p>
              </GlowCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <GlowCard className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#1B3A6B]">Watchlist</h2>
                    <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                      Public shortlist of saved stocks and mutual funds.
                    </p>
                  </div>
                  <Link href="/account/watchlists" className="text-sm font-medium text-[#1B3A6B] underline">
                    Open your watchlists
                  </Link>
                </div>
                <div className="space-y-3">
                  {data.watchlist.length ? (
                    data.watchlist.slice(0, 5).map((item) => (
                      <PublicProfileListItem
                        key={`${item.pageType}-${item.slug}`}
                        title={item.title}
                        detail={item.href}
                        href={item.href}
                      />
                    ))
                  ) : (
                    <EmptyCollection
                      title="No public watchlist items yet"
                      description="Watchlist items appear here once they are saved from signed-in product browsing."
                    />
                  )}
                </div>
              </GlowCard>

              <GlowCard className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#1B3A6B]">Portfolio snapshot</h2>
                    <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                      Shared holding summary with current value, invested amount, and P&amp;L.
                    </p>
                  </div>
                  <Link href="/portfolio" className="text-sm font-medium text-[#1B3A6B] underline">
                    Open your portfolio
                  </Link>
                </div>
                <div className="space-y-3">
                  {data.portfolio.length ? (
                    data.portfolio.slice(0, 5).map((holding) => (
                      <PublicProfileListItem
                        key={holding.stockSlug}
                        title={holding.stockName}
                        detail="Tracked in this public portfolio summary."
                        href={`/stocks/${holding.stockSlug}`}
                      />
                    ))
                  ) : (
                    <EmptyCollection
                      title="No public holdings shared yet"
                      description="Portfolio summary appears here after holdings are added in the member workspace."
                    />
                  )}
                </div>
              </GlowCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <GlowCard className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1B3A6B]">Bookmarks</h2>
                  <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    Public pages and product routes saved on this profile.
                  </p>
                </div>
                <div className="space-y-3">
                  {data.bookmarks.length ? (
                    data.bookmarks.slice(0, 5).map((item) => (
                      <PublicProfileListItem
                        key={`${item.pageType}-${item.slug}`}
                        title={item.title}
                        detail={item.href}
                        href={item.href}
                      />
                    ))
                  ) : (
                    <EmptyCollection
                      title="No public bookmarks yet"
                      description="Saved public routes appear here once they have been bookmarked."
                    />
                  )}
                </div>
              </GlowCard>

            </div>
          </div>

          {showSharedSidebar ? (
            <aside className="space-y-3 xl:sticky xl:top-20">
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
