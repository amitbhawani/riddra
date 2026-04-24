import {
  MarketSnapshotBox,
  ProductCard,
  ProductSectionTitle,
} from "@/components/product-page-system";
import type { MarketSnapshotGroup } from "@/lib/market-snapshot-system";

function filterSidebarGroups(
  groups: MarketSnapshotGroup[],
  currentIndexSlug?: string,
) {
  return groups
    .map((group) => {
      const filteredItems =
        group.family === "index" && currentIndexSlug
          ? group.items.filter((item) => item.id !== `index-${currentIndexSlug}`)
          : group.items;

      const limit = group.family === "index" ? 3 : group.family === "metal" ? 2 : 1;

      return {
        ...group,
        items: filteredItems.slice(0, limit),
      };
    })
    .filter((group) => group.items.length > 0);
}

export function MarketSnapshotOverview({
  groups,
}: {
  groups: MarketSnapshotGroup[];
}) {
  return (
    <div className="space-y-7">
      {groups.map((group) => {
        const featured = group.items[0];
        const compactItems = group.items.slice(1);

        return (
          <section key={group.id} className="space-y-4 border-t border-[rgba(226,222,217,0.82)] pt-6 first:border-t-0 first:pt-0">
            <ProductSectionTitle title={group.title} description={group.description} />
            <div
              className={
                compactItems.length
                  ? "grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
                  : "grid gap-4"
              }
            >
              <MarketSnapshotBox
                variant="full"
                family={featured.family}
                label={featured.label}
                value={featured.value}
                change={featured.change}
                sourceLabel={featured.sourceLabel}
                freshnessLabel={featured.freshnessLabel}
                truthState={featured.truthState}
                summary={featured.summary}
                metadata={featured.metadata}
                href={featured.href}
                hrefLabel={featured.hrefLabel}
              />
              {compactItems.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {compactItems.map((item) => (
                    <MarketSnapshotBox
                      key={item.id}
                      variant="compact"
                      family={item.family}
                      label={item.label}
                      value={item.value}
                      change={item.change}
                      sourceLabel={item.sourceLabel}
                      freshnessLabel={item.freshnessLabel}
                      truthState={item.truthState}
                      href={item.href}
                      hrefLabel={item.hrefLabel}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MarketSnapshotSidebar({
  groups,
  currentIndexSlug,
}: {
  groups: MarketSnapshotGroup[];
  currentIndexSlug?: string;
}) {
  const visibleGroups = filterSidebarGroups(groups, currentIndexSlug);

  if (!visibleGroups.length) {
    return null;
  }

  return (
    <ProductCard tone="secondary" className="space-y-3">
      <ProductSectionTitle
        title="Market snapshot"
        description="Last trusted index, metals, and FX anchors, kept compact enough to behave like a real research aide."
      />
      <div className="space-y-2">
        {visibleGroups.map((group, index) => (
          <div
            key={group.id}
            className={
              index > 0
                ? "space-y-1.5 border-t border-[#E2DED9] pt-2"
                : "space-y-1.5"
            }
          >
            <div className="space-y-0.5 px-0.5">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                {group.title}
              </p>
            </div>
            <div className="grid gap-1.5">
              {group.items.map((item) => (
                <MarketSnapshotBox
                  key={item.id}
                  variant="compact"
                  family={item.family}
                  label={item.label}
                  value={item.value}
                  change={item.change}
                  sourceLabel={item.sourceLabel}
                  freshnessLabel={item.freshnessLabel}
                  truthState={item.truthState}
                  href={item.href}
                  hrefLabel={item.hrefLabel}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}
