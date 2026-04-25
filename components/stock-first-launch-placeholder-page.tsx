import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBulletListCard,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductRouteGrid,
  ProductSectionTitle,
} from "@/components/product-page-system";
import type {
  StockFirstLaunchFamily,
  StockFirstLaunchVariant,
} from "@/lib/public-launch-scope";
import {
  getStockFirstLaunchPlaceholderContent,
} from "@/lib/public-launch-scope";
import type { SharedSidebarPageCategory } from "@/lib/shared-sidebar-config";

type StockFirstLaunchPlaceholderPageProps = {
  family: StockFirstLaunchFamily;
  variant?: StockFirstLaunchVariant;
  pageCategory: SharedSidebarPageCategory;
  assetName?: string;
};

export async function StockFirstLaunchPlaceholderPage({
  family,
  variant = "hub",
  pageCategory,
  assetName,
}: StockFirstLaunchPlaceholderPageProps) {
  const sidebar = await getGlobalSidebarRail(pageCategory);
  const content = getStockFirstLaunchPlaceholderContent(family, variant, assetName);

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <div className="space-y-3">
                <ProductSectionTitle
                  eyebrow={content.eyebrow}
                  title={content.title}
                  description={content.description}
                />
              </div>

              <ProductCard tone="warning" className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ProductSectionTitle
                    title="Stock-first launch posture"
                    description="This is an intentional launch-scope decision, not a broken or missing page."
                  />
                  <span className="rounded-full border border-[rgba(212,133,59,0.32)] bg-[rgba(212,133,59,0.1)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8E5723]">
                    {content.statusLabel}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ProductCard tone="compact" className="space-y-1.5 px-4 py-4">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                      Launch focus
                    </p>
                    <p className="riddra-product-number text-[20px] text-[#1B3A6B]">Stocks</p>
                  </ProductCard>
                  <ProductCard tone="compact" className="space-y-1.5 px-4 py-4">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                      This section
                    </p>
                    <p className="riddra-product-number text-[20px] text-[#1B3A6B]">Placeholder live</p>
                  </ProductCard>
                  <ProductCard tone="compact" className="space-y-1.5 px-4 py-4">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                      Next wave
                    </p>
                    <p className="riddra-product-number text-[20px] text-[#1B3A6B]">Full coverage</p>
                  </ProductCard>
                </div>
              </ProductCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <ProductBulletListCard
                  title="What stays live right now"
                  description="The public surface remains honest and stable during the first stock-first rollout."
                  items={content.currentItems.map((item) => ({ body: item }))}
                  variant="context"
                />
                <ProductBulletListCard
                  title="What opens next"
                  description="These are the workflows that return when this family moves from placeholder to real product coverage."
                  items={content.nextItems.map((item) => ({ body: item }))}
                  variant="checklist"
                />
              </div>

              <ProductRouteGrid
                title="Keep exploring"
                description="Use the live stock and market routes until this family joins the next public rollout wave."
                items={[
                  {
                    eyebrow: "Active now",
                    title: content.primaryHrefLabel,
                    description: "This is the fully active public product surface in the first launch wave.",
                    href: content.primaryHref,
                    hrefLabel: content.primaryHrefLabel,
                  },
                  {
                    eyebrow: "Stable hub",
                    title: content.secondaryHrefLabel,
                    description: "The hub remains visible so this family keeps a consistent public destination.",
                    href: content.secondaryHref,
                    hrefLabel: content.secondaryHrefLabel,
                  },
                  {
                    eyebrow: "Discovery",
                    title: "Open search",
                    description: "Search stays useful for active stock routes, indices, and launch-safe discovery surfaces.",
                    href: "/search",
                    hrefLabel: "Open search",
                  },
                ]}
              />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
