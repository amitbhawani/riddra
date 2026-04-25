import type { ReactNode } from "react";
import type { WealthFamily, WealthProduct } from "@/lib/wealth-products";

import {
  ProductBulletListCard,
  ProductCard,
  ProductInsightGridCard,
  ProductSectionTitle,
} from "@/components/product-page-system";

const familyLabels: Record<WealthFamily, string> = {
  etf: "ETF",
  pms: "PMS",
  aif: "AIF",
  sif: "SIF",
};

type WealthDetailSectionsProps = {
  family: WealthFamily;
  product: WealthProduct;
  marketNewsSection?: ReactNode;
};

export function WealthDetailSections({ family, product, marketNewsSection }: WealthDetailSectionsProps) {
  const familyLabel = familyLabels[family];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <ProductInsightGridCard
          title={`${familyLabel} snapshot`}
          description="Keep the route anchored in structure, benchmark, risk, and entry posture."
          items={[
            { label: "Manager", value: product.manager },
            { label: "Benchmark", value: product.benchmark },
            { label: "Structure", value: product.structure },
            { label: "Minimum ticket", value: product.minimumTicket },
            { label: "Risk", value: product.riskLabel },
            { label: "Liquidity", value: product.liquidity },
            { label: "Taxation lens", value: product.taxation },
            { label: "Cost lens", value: product.costNote },
          ]}
          columns={2}
          variant="quality"
        />

        <div className="space-y-4">
          <ProductCard tone="primary" className="space-y-4">
            <ProductSectionTitle
              title="Research lens"
              description="Keep the strategy argument dense, but still readable."
            />
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.92)]">
              {product.thesis}
            </p>
            <ProductInsightGridCard
              title="Research stats"
              description="Key route posture signals stay visible without relying on a different shell."
              items={product.researchStats.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              columns={3}
              tone="compact"
              variant="analysis"
            />
          </ProductCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ProductBulletListCard
              title="Portfolio role"
              description="Where this route fits in a broader allocation."
              items={product.portfolioRole.map((item) => ({ body: item }))}
              variant="context"
            />
            <ProductBulletListCard
              title="Compare lanes"
              description="The most useful adjacent decision lanes."
              items={product.compareLanes.map((item) => ({ body: item }))}
              variant="context"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ProductBulletListCard
          title="Fit for"
          description="Who should keep reading."
          items={product.fitFor.map((item) => ({ body: item }))}
          variant="checklist"
        />
        <ProductBulletListCard
          title="Avoid if"
          description="Where the route fit breaks down."
          items={product.avoidIf.map((item) => ({ body: item }))}
          variant="watchpoints"
        />
        <ProductBulletListCard
          title="Due diligence"
          description="What to validate before treating this route as final."
          items={product.dueDiligence.map((item) => ({ body: item }))}
          variant="checklist"
        />
      </div>

      <ProductBulletListCard
        title="Key notes"
        description="Compact route notes that keep the page usable as a one-page research read."
        items={product.keyPoints.map((item) => ({ body: item }))}
        variant="context"
      />

      {marketNewsSection ? <div id="news">{marketNewsSection}</div> : null}
    </div>
  );
}
