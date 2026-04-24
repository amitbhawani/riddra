import { ProductBulletListCard, ProductCard } from "@/components/product-page-system";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow } from "@/components/ui";

type WealthDetailHeaderProps = {
  breadcrumbs: Array<{ name: string; href: string }>;
  eyebrow: string;
  title: string;
  angle: string;
  summary: string;
  truthTitle: string;
  truthDescription: string;
  truthItems: string[];
  supportStats: Array<{ label: string; value: string | number; detail?: string }>;
  contained?: boolean;
};

export function WealthDetailHeader({
  breadcrumbs,
  eyebrow,
  title,
  angle,
  summary,
  truthTitle,
  truthDescription,
  truthItems,
  supportStats,
  contained = true,
}: WealthDetailHeaderProps) {
  const content = (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumbs items={breadcrumbs} />
        <Eyebrow>{eyebrow}</Eyebrow>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_260px]">
          <ProductCard tone="primary" className="space-y-3">
            <h1 className="riddra-product-display text-[2.2rem] font-semibold tracking-tight text-[#1B3A6B] sm:text-[2.8rem]">
              {title}
            </h1>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.92)]">
              {angle}
            </p>
            <p className="riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.86)]">
              {summary}
            </p>
          </ProductCard>
          <ProductCard tone="secondary" className="space-y-3">
            <p className="riddra-product-display text-[16px] font-semibold text-[#1B3A6B]">At a glance</p>
            <div className="grid gap-2">
              {supportStats.map((item) => (
                <div key={item.label} className="rounded-[8px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
                    {item.label}
                  </p>
                  <p className="riddra-product-number mt-1 text-[14px] text-[#1B3A6B]">{item.value}</p>
                  {item.detail ? (
                    <p className="riddra-product-body mt-1 text-[11px] leading-5 text-[rgba(107,114,128,0.78)]">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </ProductCard>
        </div>
      </div>

      <ProductBulletListCard
        title={truthTitle}
        description={truthDescription}
        items={truthItems.map((item) => ({ body: item }))}
        variant="context"
      />
    </div>
  );

  return contained ? <Container className="space-y-6">{content}</Container> : content;
}
