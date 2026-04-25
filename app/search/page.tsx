import Link from "next/link";
import type { Metadata } from "next";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SearchAssistForm } from "@/components/search-assist-form";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import { getSmartSearchResults, sanitizeSearchQuery, suggestedQueries } from "@/lib/smart-search";
import { env, isRealAiEnabled } from "@/lib/env";
import { getSearchIndexMemory } from "@/lib/search-index-memory-store";
import { getSearchQueryMemory, recordSearchQueryEvent } from "@/lib/search-query-memory-store";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

type PageProps = {
  searchParams: Promise<{ query?: string }>;
};

export const metadata: Metadata = {
  title: "Smart Search",
  description: "Search across stocks, IPOs, funds, tools, courses, and learning pages with intent-aware structured results.",
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { query = "" } = await searchParams;
  const safeQuery = sanitizeSearchQuery(query);
  const searchExperience = await getSmartSearchResults(safeQuery);
  const { actions, engine, focusCard, groups, results } = searchExperience;
  const [searchQueryMemory, searchIndexMemory, sharedSidebarRailData] = await Promise.all([
    safeQuery
      ? recordSearchQueryEvent({
          query: safeQuery,
          resultCount: results.length,
          actionCount: actions.length,
          groupCount: groups.length,
          focusCardTitle: focusCard?.title,
          focusCardHref: focusCard?.href,
          leadCategory: results[0]?.category,
          leadHref: results[0]?.href,
        }).catch(() => getSearchQueryMemory())
      : getSearchQueryMemory(),
    getSearchIndexMemory(),
    getSharedSidebarRailData({ pageCategory: "search" }),
  ]);
  const showSharedSidebar = sharedSidebarRailData.enabledOnPageType;
  const explanation =
    safeQuery && engine.available && results.length
      ? `Formula-first answer mode is active right now, so Riddra is grounding this search in trusted structured results${isRealAiEnabled() ? " with optional live AI enabled." : " while live AI stays selective so structured results remain the primary guide."}`
      : null;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Search", href: "/search" },
  ];
  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-3 sm:py-4">
      <ProductPageContainer className="space-y-6">
        <ProductBreadcrumbs items={breadcrumbs} />
        <div
          className={`grid gap-6 ${
            showSharedSidebar ? "xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start" : ""
          }`}
        >
          <div className="space-y-6">
            <ProductCard tone="primary" className="space-y-4 p-4 sm:p-5">
              <div className="space-y-2">
                <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                  Smart search
                </p>
                <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[36px]">
                  Search by intent, not only by ticker
                </h1>
                <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.88)] sm:text-[15px]">
                  Type in normal language and jump to the right stock, IPO, fund, ETF, PMS, AIF, SIF, tool, course, or learning page without needing to know the exact route structure.
                </p>
              </div>
            </ProductCard>

            <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
              <ProductSectionTitle
                eyebrow="Search workspace"
                title="Search across stocks, funds, indices, tools, and workflows"
                description="Use the same shared search surface across the public site and jump into the strongest route handoff from one place."
              />
              <SearchAssistForm
                defaultValue={query}
                placeholder="Search stocks, indices, funds, tools..."
                chromeTheme="light"
              />
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((item) => (
                  <Link
                    key={item}
                    href={`/search?query=${encodeURIComponent(item)}`}
                    className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-[#1B3A6B] transition hover:border-[rgba(212,133,59,0.34)] hover:bg-[rgba(27,58,107,0.03)]"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </ProductCard>

            <PublicSurfaceTruthSection
              eyebrow="Search truth"
              title="Search is ready for discovery across stocks, funds, tools, and learning routes"
              description="Use smart search to move into the right route and follow-up workflow without needing to know the exact path first."
              authReady="Signed-in continuity is active enough to carry search discovery into account and workspace flows."
              authPending="Search stays fully usable even when account-linked follow-through is temporarily limited."
              billingReady="Membership prompts stay visible where relevant once checkout and workspace continuity are exercised."
              billingPending="Premium route access appears where relevant after sign-in."
              supportReady="Support delivery is configured enough to begin testing real follow-up for public search users who convert."
              supportPending="Support guidance remains available whenever a search-led account step needs help."
              href="/launch-readiness"
              hrefLabel="Open launch readiness"
            />

            {safeQuery && !engine.available ? (
              <ProductCard tone="secondary" className="space-y-3 p-4 sm:p-5">
                <p className="riddra-product-body text-xs uppercase tracking-[0.2em] text-[#8E5723]">{engine.statusLabel}</p>
                <h2 className="riddra-product-body text-2xl font-semibold text-[#1B3A6B]">
                  Live search suggestions are still warming up
                </h2>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.84)]">{engine.detail}</p>
                <div className="rounded-[18px] border border-[rgba(212,133,59,0.24)] bg-[rgba(250,246,240,0.9)] px-4 py-3 text-sm leading-7 text-[#8E5723]">
                  Enter still works, and this route stays part of the regular search surface. The live indexed answer layer will show stronger matches once Meilisearch is healthy again.
                </div>
              </ProductCard>
            ) : null}

            {explanation ? (
              <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
                <ProductSectionTitle title="Smart answer layer" description={explanation} />
                <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-[rgba(248,246,243,0.85)] px-4 py-3 text-sm text-[rgba(107,114,128,0.82)]">
                  Current AI mode: {env.aiDefaultMode.replaceAll("_", " ")}
                </div>
              </ProductCard>
            ) : null}

            {safeQuery && actions.length ? (
              <ShowcaseRouteStrip
                eyebrow="Best next moves"
                title={`Use "${safeQuery}" as a guided route handoff`}
                description="Search now keeps the strongest follow-up routes near the top, so direct stock and fund matches can move immediately into chart, compare, sector, or category workflows."
                items={actions}
              />
            ) : null}

            {safeQuery && focusCard ? (
              <ProductCard tone="secondary" className="space-y-5 p-4 sm:p-5">
                <div className="space-y-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                    {focusCard.eyebrow}
                  </p>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-[26px] font-semibold tracking-tight text-[#1B3A6B]">{focusCard.title}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(107,114,128,0.84)]">{focusCard.summary}</p>
                    </div>
                    <Link
                      href={focusCard.href}
                      className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.03)]"
                    >
                      {focusCard.hrefLabel}
                    </Link>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {focusCard.highlights.map((item) => (
                    <div key={item.label} className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                      <p className="text-sm text-[rgba(75,85,99,0.74)]">{item.label}</p>
                      <p className="mt-2 text-sm font-medium text-[#1B3A6B]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </ProductCard>
            ) : null}

            <ProductCard tone="secondary" className="space-y-5 p-4 sm:p-5">
              <ProductSectionTitle
                title="Structured results"
                description="Route-backed results stay grouped so you can move from query to the right type of page without hunting."
              />
              {query && groups.length ? (
                groups.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1B3A6B]">{group.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[rgba(107,114,128,0.78)]">{group.description}</p>
                    </div>
                    <div className="grid gap-3">
                      {group.items.map((item) => (
                        <Link key={`${item.category}-${item.href}`} href={item.href}>
                          <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4 transition hover:border-[rgba(27,58,107,0.16)] hover:bg-[rgba(27,58,107,0.02)]">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-[#1B3A6B]">{item.title}</p>
                                <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">{item.context}</p>
                                <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.82)]">{item.reason}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="rounded-full bg-[rgba(27,58,107,0.05)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#1B3A6B]">
                                  {item.category}
                                </div>
                                {item.truthLabel ? (
                                  <div className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.03)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[rgba(27,58,107,0.76)]">
                                    {item.truthLabel}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-4 py-4 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  {safeQuery && !engine.available
                    ? `Live indexed answers are temporarily unavailable. ${engine.detail}`
                    : safeQuery
                      ? `No structured matches found for "${safeQuery}" yet. Try a more specific company, category, or workflow phrase.`
                      : "Enter a natural-language question or query to see structured results across stocks, IPOs, funds, tools, courses, and learning content."}
                </div>
              )}
            </ProductCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <ProductCard tone="secondary" className="space-y-5 p-4 sm:p-5">
                <ProductSectionTitle
                  title="Search continuity"
                  description="Search now writes a persisted query trail behind this page, so result quality and strongest handoffs can be reviewed from real usage."
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                    <p className="text-sm text-[rgba(75,85,99,0.74)]">Tracked queries</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{searchQueryMemory.summary.trackedQueries}</p>
                    <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">
                      {searchQueryMemory.summary.guidedHandoffs} guided handoffs with {searchQueryMemory.summary.focusCardHits} focus-card leads captured.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                    <p className="text-sm text-[rgba(75,85,99,0.74)]">Index posture</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{searchIndexMemory.summary.indexedRoutes}</p>
                    <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">
                      {searchIndexMemory.summary.aliasGroups} alias groups · {searchIndexMemory.summary.typoProtectedRoutes} typo-protected routes.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                    <p className="text-sm text-[rgba(75,85,99,0.74)]">Zero-result queries</p>
                    <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{searchQueryMemory.summary.zeroResultQueries}</p>
                    <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">
                      Average results per tracked query: {searchQueryMemory.summary.averageResultCount}.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                    <p className="text-sm text-[rgba(75,85,99,0.74)]">Top tracked query</p>
                    <p className="mt-2 text-base font-semibold text-[#1B3A6B]">
                      {searchQueryMemory.topQueries[0]?.query ?? "No tracked queries yet"}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">
                      {searchQueryMemory.topQueries[0]
                        ? `${searchQueryMemory.topQueries[0]?.count} captures · ${searchQueryMemory.topQueries[0]?.zeroResultCount} zero-result runs`
                        : "Tracked searches will start appearing here once users interact with this route."}
                    </p>
                  </div>
                </div>
                {searchQueryMemory.topQueries.length ? (
                  <div className="grid gap-3">
                    {searchQueryMemory.topQueries.map((item) => (
                      <div key={item.query} className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4">
                        <p className="text-sm font-medium text-[#1B3A6B]">{item.query}</p>
                        <p className="mt-2 text-xs leading-6 text-[rgba(107,114,128,0.72)]">
                          {item.count} tracked runs · {item.zeroResultCount} zero-result runs
                          {item.bestLeadHref ? ` · strongest lead ${item.bestLeadHref}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </ProductCard>

              <ProductCard tone="secondary" className="space-y-5 p-4 sm:p-5">
                <ProductSectionTitle
                  title="Why this matters"
                  description="Search should feel like a first-class public discovery surface, not a detached utility."
                />
                <div className="grid gap-3">
                  {[
                    "Users do not need to know the exact route structure to find what they want.",
                    "Direct stock and fund matches can now fan out into compare, chart, sector, and category follow-through instead of stopping at a flat list.",
                    "Wealth-product routes now sit in the same intent-aware search graph as stocks, funds, and IPOs instead of hiding behind separate hub navigation.",
                    "Good search results naturally lead users into pages, tools, signup flows, and saved workflows.",
                    "Tracked search queries now create a persistent feedback loop for zero-result gaps, alias misses, and strongest handoff routes instead of leaving search quality to guesswork.",
                  ].map((item) => (
                    <div key={item} className="rounded-[18px] border border-[rgba(226,222,217,0.82)] bg-white px-4 py-4 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                      {item}
                    </div>
                  ))}
                </div>
              </ProductCard>
            </div>
          </div>

          {showSharedSidebar ? (
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
      </ProductPageContainer>
    </div>
  );
}
