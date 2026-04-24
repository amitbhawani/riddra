import Link from "next/link";
import type { ReactNode } from "react";

import {
  ProductBulletListCard,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductRouteGrid,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { Eyebrow, SectionHeading } from "@/components/ui";
import type { WealthProduct } from "@/lib/wealth-products";

type WealthFamilyHubPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  truthTitle: string;
  truthDescription: string;
  truthItems: string[];
  stats: Array<{ label: string; value: string | number; detail?: string }>;
  categories: string[];
  laneTitle: string;
  laneDescription: string;
  laneItems: string[];
  products: WealthProduct[];
  hrefBase: string;
  sidebar?: ReactNode;
};

export function WealthFamilyHubPage({
  eyebrow,
  title,
  description,
  truthTitle,
  truthDescription,
  truthItems,
  stats,
  categories,
  laneTitle,
  laneDescription,
  laneItems,
  products,
  hrefBase,
  sidebar,
}: WealthFamilyHubPageProps) {
  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
        <div className="space-y-3">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SectionHeading title={title} description={description} />
        </div>

        <ProductCard tone="secondary" className="space-y-4">
          <ProductSectionTitle title={truthTitle} description={truthDescription} />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <ProductBulletListCard
              title="Public route posture"
              description="Keep the family hub honest about account, billing, and support posture without turning it into an operator page."
              items={truthItems.map((item) => ({ body: item }))}
              variant="context"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((item) => (
                <ProductCard key={item.label} tone="compact" className="space-y-1.5 px-4 py-4">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                    {item.label}
                  </p>
                  <p className="riddra-product-number text-[20px] text-[#1B3A6B]">{item.value}</p>
                  {item.detail ? (
                    <p className="riddra-product-body text-[12px] leading-5 text-[rgba(107,114,128,0.8)]">
                      {item.detail}
                    </p>
                  ) : null}
                </ProductCard>
              ))}
            </div>
          </div>
        </ProductCard>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ProductCard tone="primary" className="space-y-4">
            <ProductSectionTitle
              title="Category mix"
              description="Keep the visible family taxonomy tight and scannable."
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-[rgba(226,222,217,0.86)] bg-white px-3 py-1.5 text-[12px] text-[rgba(107,114,128,0.84)]"
                >
                  {category}
                </span>
              ))}
            </div>
          </ProductCard>
          <ProductBulletListCard
            title={laneTitle}
            description={laneDescription}
            items={laneItems.map((item) => ({ body: item }))}
            variant="context"
          />
        </div>

        <ProductRouteGrid
          title="Live routes"
          description="Use the family hub like the rest of the product: compact cards, direct names, and honest summary text."
          items={products.map((product) => ({
            eyebrow: product.category,
            title: product.name,
            description: product.summary,
            href: `${hrefBase}/${product.slug}`,
            hrefLabel: "Open page",
            meta: product.benchmark,
          }))}
        />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
