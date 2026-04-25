import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntityNewsSection } from "@/components/entity-news-section";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { ProductPageContainer, ProductPageTwoColumnLayout } from "@/components/product-page-system";
import { WealthDetailHeader } from "@/components/wealth-detail-header";
import { WealthDetailSections } from "@/components/wealth-detail-sections";
import { normalizeBenchmarkSlug } from "@/lib/benchmark-labels";
import { getLatestMarketNewsForEntity } from "@/lib/market-news/queries";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWealthProductBySlug, getWealthProductsByFamily } from "@/lib/wealth-products";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const publishedSlugs = await getPublishableCmsSlugSet("etf");
  return getWealthProductsByFamily("etf")
    .filter((product) => publishedSlugs.has(product.slug))
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("etf", slug);
  if (!publishableRecord) return { title: "ETF not found" };
  const product = getWealthProductBySlug("etf", slug);
  if (!product) return { title: "ETF not found" };
  return { title: `${product.name}`, description: product.summary };
}

export default async function EtfDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("etf", slug);
  if (!publishableRecord) notFound();
  const product = getWealthProductBySlug("etf", slug);
  if (!product) notFound();
  if (isStockFirstLaunchPlaceholderFamily("etfs")) {
    return (
      <StockFirstLaunchPlaceholderPage
        family="etfs"
        variant="detail"
        pageCategory="etfs"
        assetName={product.name}
      />
    );
  }
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const sidebar = await getGlobalSidebarRail("etfs");
  const benchmarkIndexSlug = normalizeBenchmarkSlug(product.benchmark);
  const marketNews = await getLatestMarketNewsForEntity({
    entityType: "etf",
    entitySlug: product.slug,
    fallbackEntityMatches: [
      { entityType: "index", entitySlug: benchmarkIndexSlug },
      { entityType: "market", entitySlug: "markets" },
    ],
    allowLatestFallback: true,
    limit: 5,
  }).catch(() => ({
    articles: [],
    matchedEntityType: null,
    usedSectorFallback: false,
    usedEntityFallback: false,
    usedKeywordFallback: false,
    usedIpoFallback: false,
    usedLatestFallback: false,
  }));
  const marketNewsDescription =
    marketNews.usedEntityFallback && marketNews.matchedEntityType === "index"
      ? `Direct ETF-linked articles are not available yet, so this section is showing the latest ${product.benchmark} news.`
      : marketNews.usedEntityFallback && marketNews.matchedEntityType === "market"
        ? "Direct ETF-linked articles are not available yet, so this section is showing broader market stories tied to the same benchmark context."
        : marketNews.usedLatestFallback
          ? "Direct ETF-linked articles are not available yet, so this section is showing the latest market stories from the broader Riddra news surface."
          : "Latest matched market news for this ETF with direct links into the full Market News archive.";

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <WealthDetailHeader
                breadcrumbs={[{ name: "Home", href: "/" }, { name: "ETFs", href: "/etfs" }, { name: product.name, href: `/etfs/${product.slug}` }]}
                eyebrow={product.category}
                title={product.name}
                angle={product.angle}
                summary={product.summary}
                truthTitle="ETF detail route truth"
                truthDescription="Keep the detail route honest about continuity while still reading like a premium public research page."
                truthItems={getPublicTruthItems(truth, {
                  continuitySubject: `${product.name} research`,
                  handoffLabel: `${product.name} ETF-to-account handoff`,
                  billingSubject: "premium ETF workflow language",
                  supportSubject: "ETF users who convert into assisted workflows",
                })}
                supportStats={[
                  { label: "Support rows", value: supportRegistry.total },
                  { label: "In progress", value: supportRegistry.inProgress },
                  { label: "Blocked", value: supportRegistry.blocked },
                  { label: "Support", value: config.supportEmail || config.billingSupportEmail || "Not configured yet" },
                ]}
                contained={false}
              />
              <WealthDetailSections
                family="etf"
                product={product}
                marketNewsSection={
                  <EntityNewsSection
                    entityType="etf"
                    entitySlug={product.slug}
                    articles={marketNews.articles}
                    usedLatestFallback={marketNews.usedLatestFallback}
                    titleOverride="Latest ETF news"
                    descriptionOverride={marketNewsDescription}
                  />
                }
              />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
