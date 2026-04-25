import Link from "next/link";
import { type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

import {
  getPublicDataStateMeta,
  type ProductCardTone,
  type ProductMarketSnapshotFamily,
  type ProductTruthState,
  type PublicDataState,
  getMarketSnapshotFamilyLabel,
  getTrendColor,
  getTruthStateMeta,
  parseDesignNumericValue,
  productPageDesignSystem,
} from "@/lib/product-page-design";

type ProductBreadcrumb = {
  label: string;
  href: string;
};

type ProductTab = {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

type ChartPoint = {
  label: string;
  value: number;
  changeFromStart?: number | null;
};

type ProductStat = {
  label: string;
  value: string;
  helper?: string;
};

type ExposureItem = {
  label: string;
  value: number | string;
};

type ReturnsRow = {
  period: string;
  asset: string;
  categoryAverage: string;
  benchmarkIndex: string;
  outperform?: boolean;
};

type AnnualReturnRow = {
  year: string;
  value: string | number;
};

type QuickStatItem = {
  label: string;
  value: string;
  helper?: string;
  withDot?: boolean;
  dotTone?: "positive" | "negative" | "neutral" | "accent";
};

type SimilarAsset = {
  name: string;
  change1Y: string;
  ratioLabel: string;
  ratioValue: string;
  sparklinePoints?: number[];
  href?: string;
  hrefLabel?: string;
};

type CtaAction = {
  label: string;
  href: string;
  tone?: "primary" | "secondary" | "ghost";
};

type ProductRouteLink = {
  eyebrow?: string;
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
  meta?: string;
};

type ProductInsightItem = {
  label: string;
  value: string;
  note?: string;
};

type ProductBulletItem = {
  title?: string;
  body: string;
  meta?: string;
  href?: string;
  hrefLabel?: string;
};

type ProductResearchStripMetric = {
  label: string;
  value: string;
};

type ProductResearchStripGroup = {
  eyebrow?: string;
  title: string;
  note?: string;
  items: ProductResearchStripMetric[];
};

type ProductDataTableRow = {
  label: string;
  value: string;
  helper?: string;
};

type ProductReadingStripItem = {
  label: string;
  value: string;
  helper?: string;
};

type ProductEditorialVariant =
  | "opening"
  | "performance"
  | "signals"
  | "quality"
  | "composition"
  | "routes"
  | "timeline";

type ProductDataTableVariant = "default" | "analysis" | "context" | "composition";

type ProductInsightVariant = "default" | "analysis" | "quality" | "composition" | "signals";

type ProductBulletListVariant = "default" | "watchpoints" | "context" | "checklist";

type ProductRouteRailVariant = "default" | "routes";

export type MarketSnapshotMetaItem = {
  label: string;
  value: string;
};

const exposureStripPalette = ["#1B3A6B", "#D4853B", "#1A7F4B", "#52B788", "#E07B54", "#6B7280"];

const dotToneMap: Record<NonNullable<QuickStatItem["dotTone"]>, string> = {
  positive: "#1A7F4B",
  negative: "#C0392B",
  neutral: "#6B7280",
  accent: "#1B3A6B",
};

const editorialVariantMeta: Record<
  ProductEditorialVariant,
  { label: string; shellClassName: string; bannerClassName: string }
> = {
  opening: {
    label: "Opening brief",
    shellClassName:
      "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(244,247,251,0.72)_100%)]",
    bannerClassName:
      "border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] text-[#1B3A6B]",
  },
  performance: {
    label: "Performance & risk",
    shellClassName:
      "border-[rgba(26,127,75,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(244,249,246,0.72)_100%)]",
    bannerClassName:
      "border-[rgba(26,127,75,0.16)] bg-[rgba(26,127,75,0.05)] text-[#1A7F4B]",
  },
  signals: {
    label: "Session signals",
    shellClassName:
      "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(243,246,250,0.72)_100%)]",
    bannerClassName:
      "border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.045)] text-[#1B3A6B]",
  },
  quality: {
    label: "Quality lens",
    shellClassName:
      "border-[rgba(212,133,59,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(250,246,240,0.72)_100%)]",
    bannerClassName:
      "border-[rgba(212,133,59,0.18)] bg-[rgba(212,133,59,0.06)] text-[#8E5723]",
  },
  composition: {
    label: "Composition & exposure",
    shellClassName:
      "border-[rgba(107,114,128,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(246,246,244,0.72)_100%)]",
    bannerClassName:
      "border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.06)] text-[#4B5563]",
  },
  routes: {
    label: "Related routes",
    shellClassName:
      "border-[rgba(27,58,107,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(247,244,240,0.76)_100%)]",
    bannerClassName:
      "border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] text-[#1B3A6B]",
  },
  timeline: {
    label: "Timeline",
    shellClassName:
      "border-[rgba(107,114,128,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(245,245,245,0.74)_100%)]",
    bannerClassName:
      "border-[rgba(107,114,128,0.18)] bg-[rgba(107,114,128,0.06)] text-[#4B5563]",
  },
};

const researchStripAccentClasses = [
  "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(244,247,251,0.96)_100%)]",
  "border-[rgba(26,127,75,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(244,249,246,0.95)_100%)]",
  "border-[rgba(212,133,59,0.16)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(250,246,240,0.95)_100%)]",
  "border-[rgba(107,114,128,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(246,246,244,0.95)_100%)]",
];

export function ProductCard({
  children,
  tone = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  tone?: ProductCardTone;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={clsx(
        "riddra-product-card riddra-product-body relative overflow-hidden rounded-[12px] border shadow-[0_10px_28px_rgba(27,58,107,0.045)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(27,58,107,0.18),transparent)]",
        tone === "primary" &&
          "riddra-product-card-primary border-[rgba(27,58,107,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(248,246,242,0.97)_100%)]",
        tone === "secondary" &&
          "riddra-product-card-secondary border-[rgba(221,215,207,0.96)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(247,244,240,0.94)_100%)]",
        tone === "compact" &&
          "riddra-product-card-compact border-[rgba(221,215,207,0.95)] bg-[linear-gradient(180deg,rgba(248,246,243,0.98)_0%,#FFFFFF_100%)]",
        tone === "warning" &&
          "riddra-product-card-warning border-[rgba(212,133,59,0.35)] bg-[linear-gradient(180deg,rgba(212,133,59,0.07)_0%,#FFFFFF_100%)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ProductSectionTitle({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="riddra-product-body text-[16px] font-semibold leading-[1.35] text-[#1B3A6B]">
        {title}
      </h2>
      {description ? (
        <p className="riddra-product-body max-w-3xl text-[12px] leading-[1.5] text-[rgba(107,114,128,0.88)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function ProductTruthBadge({ state }: { state: ProductTruthState }) {
  const meta = getTruthStateMeta(state);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}12`,
      }}
    >
      <span
        className="block h-2 w-2 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}

function buildChartGeometry(points: number[], width: number, height: number, padding: number) {
  if (!points.length) {
    return { linePath: "", areaPath: "", circles: [] as Array<{ x: number; y: number }> };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const circles = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const normalized = (point - min) / range;
    const y = height - padding - normalized * (height - padding * 2);

    return { x, y };
  });

  const linePath = circles.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const last = circles[circles.length - 1];
  const first = circles[0];
  const areaPath = `${linePath} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;

  return { linePath, areaPath, circles };
}

function Sparkline({
  points,
  stroke,
  height = 42,
}: {
  points: number[];
  stroke: string;
  height?: number;
}) {
  const width = 156;
  const { linePath } = buildChartGeometry(points.length ? points : [0, 0], width, height, 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[42px] w-full" role="img" aria-label="Three month sparkline">
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProductPageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto w-full max-w-[1220px] px-3 sm:px-4 lg:px-4 xl:px-5", className)}>
      {children}
    </div>
  );
}

export function ProductBreadcrumbs({ items }: { items: ProductBreadcrumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="riddra-product-body flex flex-wrap items-center gap-1.5 border-b border-[rgba(226,222,217,0.72)] pb-3 text-[12px] text-[rgba(107,114,128,0.78)]"
    >
      {items.map((item, index) => (
        <span key={`${item.href}-${item.label}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-[rgba(226,222,217,1)]">/</span> : null}
          <Link href={item.href} className="transition hover:text-[#1B3A6B]">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function ProductPageShell({
  breadcrumbs,
  hero,
  stickyTabs,
  summary,
  supportingSections,
  similarAssets,
  sidebar,
  className,
}: {
  breadcrumbs?: ProductBreadcrumb[];
  hero: ReactNode;
  stickyTabs: ReactNode;
  summary: ReactNode;
  supportingSections?: ReactNode;
  similarAssets?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}) {
  const content = (
    <div className="space-y-3">
      {breadcrumbs?.length ? <ProductBreadcrumbs items={breadcrumbs} /> : null}
      {hero}
      {stickyTabs}
      {summary}
      {supportingSections}
      {similarAssets}
    </div>
  );

  return (
    <div
      className={clsx(
        "riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5",
        className,
      )}
    >
      <ProductPageContainer className={sidebar ? "space-y-0" : "space-y-3"}>
        {sidebar ? <ProductPageTwoColumnLayout left={content} right={sidebar} /> : content}
      </ProductPageContainer>
    </div>
  );
}

export function ProductPageTwoColumnLayout({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid gap-3.5 sm:gap-4 xl:gap-[18px] lg:grid-cols-[minmax(0,76.25%)_minmax(246px,23.75%)] xl:grid-cols-[minmax(0,76.9%)_minmax(252px,23.1%)]",
        className,
      )}
    >
      <div className="min-w-0 space-y-3.5 sm:space-y-5">{left}</div>
      <aside className="grid min-w-0 gap-3 sm:gap-3.5 md:grid-cols-2 lg:grid-cols-1">{right}</aside>
    </div>
  );
}

export function StickyTabBar({
  tabs,
  className,
  tabListClassName,
}: {
  tabs: ProductTab[];
  className?: string;
  tabListClassName?: string;
}) {
  return (
    <div
      className={clsx(
        "riddra-product-tabbar relative sticky top-14 z-20 -mx-1 overflow-x-auto rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(251,250,248,0.98)] px-2 shadow-[0_10px_22px_rgba(27,58,107,0.05)] backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-2.5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(27,58,107,0.16),transparent)]",
        "riddra-product-tabbar relative sticky top-12 z-20 -mx-1 overflow-x-auto rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(251,250,248,0.98)] px-2 shadow-[0_10px_22px_rgba(27,58,107,0.05)] backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-2.5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(27,58,107,0.16),transparent)]",
        className,
      )}
    >
      <div className={clsx("flex min-w-max items-center gap-2 sm:gap-3", tabListClassName)}>
        {tabs.map((tab) => {
          const classes = clsx(
            "riddra-product-body inline-flex min-h-[38px] min-w-[78px] shrink-0 items-center justify-center rounded-[8px] border px-2 text-[11px] font-medium transition sm:min-h-[40px] sm:min-w-[90px] sm:px-2.5 sm:text-[13px]",
            tab.active
              ? "border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] text-white shadow-[0_10px_20px_rgba(27,58,107,0.14)]"
              : "border-transparent text-[rgba(107,114,128,0.88)] hover:border-[rgba(27,58,107,0.08)] hover:bg-white hover:text-[#1B3A6B]",
          );

          return tab.href ? (
            <Link key={tab.id} href={tab.href} className={classes} aria-current={tab.active ? "page" : undefined}>
              {tab.label}
            </Link>
          ) : tab.onClick ? (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={classes}
              aria-current={tab.active ? "page" : undefined}
            >
              {tab.label}
            </button>
          ) : (
            <span key={tab.id} className={classes} aria-current={tab.active ? "page" : undefined}>
              {tab.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function HeroPriceBlock({
  title,
  categoryBadge,
  subtitle,
  metaLine,
  price,
  change,
  asOf,
  truthState,
  cta,
  supportingNote,
}: {
  title: string;
  categoryBadge: string;
  subtitle: string;
  metaLine?: string;
  price: string;
  change: string;
  asOf: string;
  truthState: ProductTruthState;
  cta?: ReactNode;
  supportingNote?: string;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_236px] lg:items-start">
      <ProductCard tone="primary" className="space-y-0 p-0">
        <div className="space-y-1.5 p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="riddra-product-display text-[1.9rem] font-semibold leading-[1.02] tracking-tight text-[#1B3A6B] sm:text-[2.35rem] lg:text-[2.7rem]">
              {title}
            </h1>
            <span className="riddra-product-body inline-flex rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#1B3A6B]">
              {categoryBadge}
            </span>
          </div>
          <div className="grid gap-1.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-1">
              <p className="riddra-product-body text-[13px] text-[rgba(107,114,128,0.96)]">{subtitle}</p>
              {metaLine ? (
                <p className="riddra-product-body text-[12px] text-[rgba(107,114,128,0.82)]">{metaLine}</p>
              ) : null}
            </div>
            <div className="lg:justify-self-end">
              <ProductTruthBadge state={truthState} />
            </div>
          </div>
        </div>
        <div className="border-t border-[#E2DED9] bg-[linear-gradient(180deg,rgba(27,58,107,0.03)_0%,rgba(255,255,255,0)_100%)] px-3 py-2 sm:px-3.5 sm:py-2">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(198px,0.68fr)] lg:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <p className="riddra-product-number text-[2.1rem] font-medium tracking-tight text-[#1B3A6B] sm:text-[2.55rem] lg:text-[3rem]">
                  {price}
                </p>
                <p
                  className="riddra-product-number rounded-[9px] border border-[rgba(27,58,107,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,246,243,0.96))] px-2.5 py-1 text-[12px] font-medium shadow-[0_10px_18px_rgba(27,58,107,0.035)] sm:px-3 sm:py-1.5 sm:text-[14px]"
                  style={{ color: getTrendColor(change) }}
                >
                  {change}
                </p>
              </div>
              <div className="grid gap-1.5 min-[460px]:grid-cols-2">
                <div className="rounded-[9px] border border-[rgba(27,58,107,0.1)] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(27,58,107,0.028)]">
                  <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.82)]">
                    Last trusted update
                  </p>
                  <p className="riddra-product-number mt-1.5 text-sm text-[#1B3A6B]">As of {asOf}</p>
                </div>
                <div className="rounded-[9px] border border-[rgba(226,222,217,0.86)] bg-[rgba(255,255,255,0.86)] px-3 py-2 shadow-[0_8px_18px_rgba(27,58,107,0.02)]">
                  <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.82)]">
                    Current posture
                  </p>
                  <div className="mt-1.5">
                    <ProductTruthBadge state={truthState} />
                  </div>
                </div>
              </div>
            </div>
            {supportingNote ? (
              <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-[rgba(255,255,255,0.78)] px-3 py-2 lg:min-h-full">
                <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.82)]">
                  Reading context
                </p>
                <p className="riddra-product-body mt-1.5 text-[13px] leading-6 text-[rgba(107,114,128,0.92)]">
                  {supportingNote}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </ProductCard>
      {cta ? <div className="min-w-0 lg:pt-1">{cta}</div> : null}
    </div>
  );
}

export function ExposureStrip({
  title,
  items,
  description,
}: {
  title: string;
  items: ExposureItem[];
  description?: string;
}) {
  const visibleItems = items.slice(0, 6);
  const numericWeights = visibleItems.map((item) => parseDesignNumericValue(item.value) ?? 0);
  const total = numericWeights.reduce((sum, value) => sum + value, 0);
  const hasRenderableWeights = total > 0;

  return (
    <ProductCard tone="secondary" className="space-y-4">
      <ProductSectionTitle title={title} description={description} eyebrow="Exposure" />
      {hasRenderableWeights ? (
        <div className="overflow-hidden rounded-[10px] border border-[#E2DED9] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="flex min-h-[44px] w-full sm:min-h-[52px]">
            {visibleItems.map((item, index) => {
              const width = `${(numericWeights[index] / total) * 100}%`;

              return (
                <div
                  key={item.label}
                  className="riddra-product-body flex min-h-[44px] items-center justify-center px-2 text-center text-[11px] font-medium text-white sm:min-h-[52px] sm:px-3 sm:text-xs"
                  style={{
                    width,
                    backgroundColor: exposureStripPalette[index % exposureStripPalette.length],
                  }}
                  title={`${item.label}: ${item.value}`}
                >
                  <span className="sm:hidden">{item.value}</span>
                  <span className="hidden sm:inline">
                    {item.label} {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[#E2DED9] bg-[rgba(250,250,250,0.72)] px-4 py-5">
          <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
            Verified exposure weights are unavailable for this section right now, so the strip stays empty instead of inventing a composition view.
          </p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2 rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: exposureStripPalette[index % exposureStripPalette.length] }}
              aria-hidden="true"
            />
            <span className="riddra-product-body text-sm text-[rgba(107,114,128,0.92)]">
              {item.label} <span className="riddra-product-number">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function MainChartContainer({
  chartId,
  title,
  description,
  attribution,
  timeframes,
  points,
  supportingStats,
  truthState,
  showTruthBadge = true,
  chartContent,
  emptyState,
}: {
  chartId: string;
  title: string;
  description?: string;
  attribution?: {
    label?: string;
    value: string;
  };
  timeframes: ProductTab[];
  points: ChartPoint[];
  supportingStats: ProductStat[];
  truthState: ProductTruthState;
  showTruthBadge?: boolean;
  chartContent?: ReactNode;
  emptyState?: {
    state?: PublicDataState;
    title?: string;
    description?: string;
  };
}) {
  const width = 760;
  const height = 320;
  const padding = 24;
  const values = points.map((point) => point.value);
  const { linePath, areaPath, circles } = buildChartGeometry(values.length ? values : [0, 0], width, height, padding);
  const firstValue = values[0] ?? 0;
  const hasRenderablePoints = points.length > 1;
  const emptyStateMeta = getPublicDataStateMeta(emptyState?.state ?? "unavailable");

  return (
    <ProductCard tone="primary" className="space-y-3.5 overflow-hidden">
      <div className="flex flex-col gap-2.5 border-b border-[#E2DED9] pb-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <ProductSectionTitle title={title} description={description} eyebrow="Chart" />
          {attribution ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1.5 riddra-product-body text-[11px] leading-5 text-[rgba(107,114,128,0.84)]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span className="uppercase tracking-[0.14em] text-[rgba(107,114,128,0.76)]">
                {attribution.label ?? "Source"}
              </span>{" "}
              <span className="font-medium text-[rgba(27,58,107,0.88)]">{attribution.value}</span>
            </p>
          ) : null}
        </div>
        <div className="relative z-10 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto rounded-[10px] border border-[#E2DED9] bg-[rgba(250,250,250,0.85)] p-1 xl:w-auto xl:min-w-max xl:justify-end">
          {timeframes.map((timeframe) => {
            const classes = clsx(
              "riddra-product-body inline-flex h-8 shrink-0 items-center justify-center rounded-[7px] border px-2.5 text-[13px] font-medium sm:h-9 sm:px-3",
              timeframe.active
                ? "border-[#1B3A6B] bg-[#1B3A6B] text-white shadow-[0_8px_18px_rgba(27,58,107,0.16)]"
                : "border-transparent bg-transparent text-[#1B3A6B]",
            );

            return timeframe.href ? (
              <Link key={timeframe.id} href={timeframe.href} aria-current={timeframe.active ? "page" : undefined} className={classes}>
                {timeframe.label}
              </Link>
            ) : timeframe.onClick ? (
              <button
                key={timeframe.id}
                type="button"
                onClick={timeframe.onClick}
                aria-pressed={timeframe.active}
                className={classes}
              >
                {timeframe.label}
              </button>
            ) : (
              <button
                key={timeframe.id}
                type="button"
                disabled
                aria-disabled="true"
                aria-pressed={timeframe.active}
                className={classes}
              >
                {timeframe.label}
              </button>
            );
          })}
        </div>
      </div>
      {chartContent ? (
        chartContent
      ) : hasRenderablePoints ? (
        <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[linear-gradient(180deg,rgba(27,58,107,0.045),rgba(27,58,107,0.012))] px-2.5 py-3 sm:px-3 sm:py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[236px] w-full sm:h-[280px] lg:h-[320px]"
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(27, 58, 107, 0.08)" />
                <stop offset="100%" stopColor="rgba(27, 58, 107, 0)" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                x1={padding}
                x2={width - padding}
                y1={padding + ((height - padding * 2) / 3) * line}
                y2={padding + ((height - padding * 2) / 3) * line}
                stroke="#E2DED9"
                strokeDasharray="0"
              />
            ))}
            <path d={areaPath} fill={`url(#${chartId}-fill)`} />
            <path d={linePath} fill="none" stroke="#1B3A6B" strokeWidth="3" strokeLinecap="round" />
            {circles.map((point, index) => {
              const currentValue = points[index]?.value ?? 0;
              const periodChange =
                points[index]?.changeFromStart ??
                ((currentValue - firstValue) / Math.max(Math.abs(firstValue), 1)) * 100;

              return (
                <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="6" fill="#FFFFFF" stroke="#1B3A6B" strokeWidth="2">
                  <title>{`${points[index]?.label ?? `Point ${index + 1}`} • ${currentValue.toFixed(2)} • ${periodChange >= 0 ? "+" : ""}${periodChange.toFixed(2)}%`}</title>
                </circle>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-[#E2DED9] bg-[rgba(250,250,250,0.72)] px-5 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="riddra-product-display text-xl font-semibold text-[#1B3A6B]">
              {emptyState?.title ?? emptyStateMeta.title}
            </p>
            <ProductTruthBadge
              state={
                emptyState?.state === "read_failed"
                  ? "read_failed"
                  : emptyState?.state === "delayed_snapshot"
                    ? "delayed_snapshot"
                    : "unavailable"
              }
            />
          </div>
          <p className="riddra-product-body mt-3 text-sm leading-7 text-[rgba(107,114,128,0.92)]">
            {emptyState?.description ??
              emptyStateMeta.description}
          </p>
        </div>
      )}
      <div className="grid gap-3 border-t border-[#E2DED9] pt-5 min-[430px]:grid-cols-2 sm:pt-5.5">
        {supportingStats.map((stat, index) => (
          <div
            key={stat.label}
            className={clsx(
              "space-y-1.5 rounded-[9px] border px-3.5 py-3.5",
              index < 2
                ? "border-[rgba(27,58,107,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,246,243,0.95))] shadow-[0_10px_18px_rgba(27,58,107,0.03)]"
                : "border-[rgba(226,222,217,0.82)] bg-white",
            )}
          >
            <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
              {stat.label}
            </p>
            <p className={clsx("riddra-product-number font-medium text-[#1B3A6B]", index < 2 ? "text-lg" : "text-base")}>
              {stat.value}
            </p>
            {stat.helper ? (
              <p className="riddra-product-body text-xs leading-6 text-[rgba(107,114,128,0.82)]">{stat.helper}</p>
            ) : null}
          </div>
        ))}
      </div>
      {showTruthBadge ? (
        <div className="flex justify-end">
          <ProductTruthBadge state={truthState} />
        </div>
      ) : null}
    </ProductCard>
  );
}

export function ValuationVerticalBar({
  title,
  valueLabel,
  positionPercent,
  helperText,
}: {
  title: string;
  valueLabel: string;
  positionPercent?: number | null;
  helperText?: string;
}) {
  const hasScore = typeof positionPercent === "number" && Number.isFinite(positionPercent);
  const topOffset = hasScore ? `${100 - Math.min(Math.max(positionPercent, 0), 100)}%` : "50%";

  return (
    <ProductCard tone="secondary" className="space-y-4">
      <ProductSectionTitle title={title} description={helperText} eyebrow="Valuation" />
      <div className="flex items-start gap-5 rounded-[10px] border border-[rgba(226,222,217,0.78)] bg-white px-4 py-4">
        <div className="relative h-[220px] w-10 overflow-hidden rounded-full border border-[#E2DED9]">
          {productPageDesignSystem.colors.valuation.map((color, index) => (
            <div
              key={color}
              className="w-full"
              style={{ height: `${100 / productPageDesignSystem.colors.valuation.length}%`, backgroundColor: color }}
            />
          ))}
          {hasScore ? (
            <div
              className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-[#1B3A6B] shadow-sm"
              style={{ top: `calc(${topOffset} - 8px)` }}
            />
          ) : (
            <div
              className="absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-dashed border-[#1B3A6B] bg-white"
              style={{ top: `calc(${topOffset} - 10px)` }}
            />
          )}
        </div>
        <div className="flex-1 space-y-5">
          <div>
            <p className="riddra-product-number text-2xl font-medium text-[#1B3A6B]">{valueLabel}</p>
            <p className="riddra-product-body mt-2 text-sm text-[rgba(107,114,128,0.92)]">
              Bottom: significantly undervalued
            </p>
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.92)]">
              Top: significantly overvalued
            </p>
          </div>
        </div>
      </div>
    </ProductCard>
  );
}

export function TrailingReturnsTable({
  title,
  description,
  rows,
  assetLabel = "Asset Return",
  categoryLabel = "Category Average",
  benchmarkLabel = "Benchmark Index",
}: {
  title: string;
  description?: string;
  rows: ReturnsRow[];
  assetLabel?: string;
  categoryLabel?: string;
  benchmarkLabel?: string;
}) {
  return (
    <ProductCard tone="primary" className="space-y-3 overflow-hidden">
      <ProductSectionTitle title={title} description={description} />
      <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="bg-[linear-gradient(180deg,rgba(226,222,217,0.4),rgba(226,222,217,0.18))] text-left">
              <th className="riddra-product-body px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)] sm:px-3.5">Period</th>
              <th className="riddra-product-body px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)] sm:px-3.5">{assetLabel}</th>
              <th className="riddra-product-body px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)] sm:px-3.5">{categoryLabel}</th>
              <th className="riddra-product-body px-3 py-2.5 text-[12px] font-medium text-[rgba(107,114,128,0.9)] sm:px-3.5">{benchmarkLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.period}
                className={clsx(
                  "border-t border-[#E2DED9] bg-white",
                  index === 0 && "bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#FFFFFF)]",
                )}
              >
                <td className="riddra-product-body px-3 py-2.5 text-[13px] text-[#1B3A6B] sm:px-3.5">{row.period}</td>
                <td
                  className={clsx(
                    "riddra-product-number px-3 py-3 font-medium sm:px-4",
                    index === 0 ? "text-[14px]" : "text-[13px]",
                  )}
                  style={{ color: getTrendColor(row.asset) }}
                >
                  {row.asset} {row.outperform ? <span className="ml-1 text-[#1A7F4B]">↑</span> : null}
                </td>
                <td className="riddra-product-number px-3 py-2.5 text-[13px] sm:px-3.5" style={{ color: getTrendColor(row.categoryAverage) }}>
                  {row.categoryAverage}
                </td>
                <td className="riddra-product-number px-3 py-2.5 text-[13px] sm:px-3.5" style={{ color: getTrendColor(row.benchmarkIndex) }}>
                  {row.benchmarkIndex}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProductCard>
  );
}

export function AnnualReturnsBlock({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: AnnualReturnRow[];
}) {
  const parsedValues = rows.map((row) => Math.abs(parseDesignNumericValue(row.value) ?? 0));
  const maxValue = Math.max(...parsedValues, 1);
  const hasRenderableRows = rows.some((row) => parseDesignNumericValue(row.value) !== null);

  return (
    <ProductCard tone="secondary" className="space-y-3">
      <ProductSectionTitle title={title} description={description} />
      {hasRenderableRows ? (
        <div className="space-y-2">
          {rows.map((row) => {
            const parsed = parseDesignNumericValue(row.value);
            const numeric = parsed ?? 0;
            const width = parsed === null ? "0%" : `${(Math.abs(numeric) / maxValue) * 100}%`;

            return (
              <div
                key={row.year}
                className="grid grid-cols-[58px_minmax(0,1fr)_72px] items-center gap-2 rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-2 sm:grid-cols-[78px_minmax(0,1fr)_88px] sm:gap-2.5"
              >
                <span className="riddra-product-number text-sm text-[#1B3A6B]">{row.year}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(226,222,217,0.5)]">
                  {parsed !== null ? (
                    <div
                      className="h-full rounded-full"
                      style={{
                        width,
                        backgroundColor: numeric >= 0 ? "#1A7F4B" : "#C0392B",
                      }}
                    />
                  ) : null}
                </div>
                <span className="riddra-product-number text-right text-sm" style={{ color: getTrendColor(row.value) }}>
                  {typeof row.value === "number"
                    ? `${row.value >= 0 ? "+" : ""}${row.value.toFixed(2)}%`
                    : row.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
          Verified annual-return history is unavailable for this route right now, so the year-by-year block stays explicit instead of inferring historical performance.
        </p>
      )}
    </ProductCard>
  );
}

export function QuickStatsCard({
  title,
  description,
  attribution,
  items,
  brand,
}: {
  title: string;
  description?: string;
  attribution?: {
    label?: string;
    value: string;
  };
  items: QuickStatItem[];
  brand?: {
    name: string;
    logo?: ReactNode;
  };
}) {
  return (
    <ProductCard tone="primary" className="space-y-4 lg:sticky lg:top-28">
      <ProductSectionTitle title={title} description={description} />
      {attribution ? (
        <div className="rounded-[9px] border border-[rgba(226,222,217,0.82)] bg-[rgba(250,250,250,0.82)] px-3.5 py-2.5">
          <p className="riddra-product-body text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
            {attribution.label ?? "Source"}
          </p>
          <p className="riddra-product-body mt-1 text-sm font-medium leading-6 text-[#1B3A6B]">
            {attribution.value}
          </p>
        </div>
      ) : null}
      {brand ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(27,58,107,0.05),rgba(255,255,255,0.9))] px-3.5 py-3 sm:px-4 sm:py-3.5">
          {brand.logo ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2DED9] bg-white">
              {brand.logo}
            </div>
          ) : null}
          <span className="riddra-product-body text-sm font-medium text-[#1B3A6B]">{brand.name}</span>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white shadow-[0_10px_20px_rgba(27,58,107,0.025)]">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={clsx(
              "space-y-1.5 px-4 py-3.5",
              index === 0 && "bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#FFFFFF)]",
              index > 0 && "border-t border-[rgba(226,222,217,0.78)]",
            )}
          >
            <div className="flex items-start justify-between gap-4 sm:items-center">
              <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.84)]">
                {item.label}
              </p>
              <div className="flex max-w-[60%] items-start gap-2 text-right sm:max-w-none sm:items-center">
                {item.withDot ? (
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0"
                    style={{ backgroundColor: dotToneMap[item.dotTone ?? "neutral"] }}
                    aria-hidden="true"
                  />
                ) : null}
                <p
                  className={clsx(
                    "riddra-product-number break-words font-medium text-[#1B3A6B]",
                    index === 0 ? "text-[17px]" : "text-[15px]",
                  )}
                >
                  {item.value}
                </p>
              </div>
            </div>
            {item.helper ? (
              <p className="riddra-product-body text-xs leading-6 text-[rgba(107,114,128,0.82)]">{item.helper}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function CategoryRankBadge({
  title,
  rankLabel,
  detail,
}: {
  title: string;
  rankLabel: string;
  detail: string;
}) {
  return (
    <ProductCard tone="compact" className="space-y-2.5 border-l-[3px] border-l-[#1B3A6B]">
      <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
        {title}
      </p>
      <p className="riddra-product-number text-xl font-medium text-[#1B3A6B]">{rankLabel}</p>
      <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.88)]">{detail}</p>
    </ProductCard>
  );
}

export function SimilarAssetsRow({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: SimilarAsset[];
}) {
  return (
    <div className="space-y-4 riddra-product-section border-t border-[rgba(226,222,217,0.82)] pt-6">
      <ProductSectionTitle title={title} description={description} eyebrow="Peers" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <ProductCard key={item.name} tone="secondary" className="space-y-3">
            <div className="space-y-2.5">
              <div className="space-y-2 border-b border-[rgba(226,222,217,0.82)] pb-3">
                {index === 0 ? (
                  <p className="riddra-product-body text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.8)]">
                    Closest peer
                  </p>
                ) : null}
                <h3 className="riddra-product-body text-base font-medium text-[#1B3A6B]">
                  {item.href ? (
                    <Link href={item.href} className="transition hover:text-[#D4853B]">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </h3>
                <p className="riddra-product-number text-lg font-medium" style={{ color: getTrendColor(item.change1Y) }}>
                  {item.change1Y}
                </p>
              </div>
              <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-3">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                  {item.ratioLabel}
                </p>
                <p className="riddra-product-number mt-2 text-sm text-[#1B3A6B]">{item.ratioValue}</p>
              </div>
            </div>
            {item.sparklinePoints && item.sparklinePoints.length > 1 ? (
              <div className="rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-3 py-3">
                <Sparkline points={item.sparklinePoints} stroke={getTrendColor(item.change1Y)} />
              </div>
            ) : (
              <p className="riddra-product-body rounded-[8px] border border-dashed border-[rgba(226,222,217,0.82)] bg-[rgba(250,250,250,0.72)] px-3 py-3 text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                3M sparkline unavailable until verified chart bars exist for this asset.
              </p>
            )}
          </ProductCard>
        ))}
      </div>
    </div>
  );
}

export function CtaBlock({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions: CtaAction[];
}) {
  return (
    <ProductCard tone="secondary" className="space-y-4 lg:sticky lg:top-28">
      <ProductSectionTitle title={title} description={description} />
      <div className="grid gap-3">
        {actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className={clsx(
              "riddra-product-body inline-flex min-h-[46px] items-center justify-center rounded-[8px] px-4 text-sm font-medium transition",
              action.tone === "secondary" &&
                "border border-[#1B3A6B] bg-white text-[#1B3A6B] hover:border-[#D4853B] hover:text-[#D4853B]",
              action.tone === "ghost" &&
                "border border-[#E2DED9] bg-[#FAFAFA] text-[#1B3A6B] hover:border-[#1B3A6B]",
              (!action.tone || action.tone === "primary") &&
                "bg-[#1B3A6B] text-white shadow-[0_12px_24px_rgba(27,58,107,0.16)] hover:bg-[#D4853B]",
            )}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </ProductCard>
  );
}

export function MarketSnapshotBox({
  variant = "full",
  family,
  label,
  value,
  change,
  asOf,
  sourceLabel,
  freshnessLabel,
  truthState,
  summary,
  metadata = [],
  href,
  hrefLabel,
}: {
  variant?: "compact" | "full";
  family: ProductMarketSnapshotFamily;
  label: string;
  value: string;
  change?: string;
  asOf?: string;
  sourceLabel?: string;
  freshnessLabel?: string;
  truthState: ProductTruthState;
  summary?: string;
  metadata?: MarketSnapshotMetaItem[];
  href?: string;
  hrefLabel?: string;
}) {
  const resolvedFreshnessLabel = freshnessLabel ?? asOf ?? "Unavailable";
  const resolvedSourceLabel = sourceLabel ?? "Verified source unavailable";

  return (
    <ProductCard
      tone={variant === "compact" ? "compact" : "secondary"}
      className={clsx(
        variant === "full" ? "space-y-2.5 min-h-full" : "space-y-2 px-2.5 py-2",
      )}
    >
      <div className={clsx("flex gap-2.5", variant === "compact" ? "items-center justify-between" : "flex-wrap items-start justify-between")}>
        <div className="min-w-0 space-y-1">
          <p className="riddra-product-body text-[10px] uppercase tracking-[0.22em] text-[rgba(107,114,128,0.84)]">
            {getMarketSnapshotFamilyLabel(family)}
          </p>
          <h3 className={clsx("riddra-product-body font-medium text-[#1B3A6B]", variant === "compact" ? "text-sm" : "text-base")}>
            {href ? (
              <Link href={href} className="transition hover:text-[#D4853B]">
                {label}
              </Link>
            ) : (
              label
            )}
          </h3>
        </div>
        <ProductTruthBadge state={truthState} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <p className={clsx("riddra-product-number font-medium text-[#1B3A6B]", variant === "full" ? "text-[1.75rem]" : "text-[1.05rem]")}>
          {value}
        </p>
        {change ? (
          <p
            className="riddra-product-number rounded-full border border-[rgba(226,222,217,0.86)] bg-white px-2 py-0.5 text-[11px] font-medium"
            style={{ color: getTrendColor(change) }}
          >
            {change}
          </p>
        ) : null}
      </div>
      {variant === "compact" ? (
        <div className="border-t border-[#E2DED9] pt-1.5">
          <p className="riddra-product-body text-[11px] leading-5 text-[rgba(107,114,128,0.9)]">
            {resolvedSourceLabel} • {resolvedFreshnessLabel}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 border-t border-[#E2DED9] pt-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.8)]">
              Source
            </p>
            <p className="riddra-product-body text-xs leading-6 text-[rgba(107,114,128,0.9)]">
              {resolvedSourceLabel}
            </p>
          </div>
          <div className="space-y-1">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.8)]">
              Freshness
            </p>
            <p className="riddra-product-body text-xs leading-6 text-[rgba(107,114,128,0.9)]">
              {resolvedFreshnessLabel}
            </p>
          </div>
        </div>
      )}
      {variant === "full" && summary ? (
        <p className="riddra-product-body rounded-[8px] border border-[rgba(226,222,217,0.78)] bg-white px-4 py-4 text-sm leading-7 text-[rgba(107,114,128,0.9)]">
          {summary}
        </p>
      ) : null}
      {variant === "full" && metadata.length ? (
        <div className="grid gap-3 border-t border-[#E2DED9] pt-4 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.82)]">
                {item.label}
              </p>
              <p className="riddra-product-number text-sm text-[#1B3A6B]">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </ProductCard>
  );
}

export function ProductPageDesignRules() {
  return (
    <ProductCard tone="warning" className="space-y-4">
      <ProductSectionTitle
        title="Product page shell rules"
        description="Desktop-first, box-driven, one-chart-only product pages with precise number handling and strict alignment."
      />
      <ul className="riddra-product-body list-disc space-y-2 pl-5 text-sm leading-7 text-[rgba(107,114,128,0.9)]">
        <li>Desktop uses a strict 70/30 layout. Mobile collapses to a single stack at 768px.</li>
        <li>The hero contains only name, price, change, timestamp, badge, and CTA. No hero chart.</li>
        <li>The tab bar uses underline-only active state and remains sticky as the page scrolls.</li>
        <li>All core sections stay inline. No modals, popups, or comparison overlays.</li>
      </ul>
    </ProductCard>
  );
}

export function ProductEditorialCluster({
  id,
  title,
  description,
  eyebrow = "Section",
  summaryNote,
  children,
  className,
  variant = "opening",
}: {
  id?: string;
  title: string;
  description?: string;
  eyebrow?: string;
  summaryNote?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: ProductEditorialVariant;
}) {
  const meta = editorialVariantMeta[variant];

  return (
    <section id={id} className={clsx("riddra-product-section scroll-mt-32", className)}>
      <div
        className={clsx(
          "space-y-3 rounded-[14px] border px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:space-y-3.5 sm:px-5 sm:py-4",
          meta.shellClassName,
        )}
      >
        <div
          className={clsx(
            "flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5",
            meta.bannerClassName,
          )}
        >
          <p className="riddra-product-body text-[13px] font-medium">
            {meta.label}
          </p>
          <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.88)]">
            {eyebrow}
          </p>
        </div>
        <div className="grid gap-2.5 border-b border-[rgba(226,222,217,0.82)] pb-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)] lg:items-end">
          <ProductSectionTitle title={title} description={description} />
          {summaryNote ? (
            <div className="rounded-[9px] border border-[rgba(221,215,207,0.84)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.022)]">
              {summaryNote}
            </div>
          ) : null}
        </div>
        <div className="space-y-3.5">{children}</div>
      </div>
    </section>
  );
}

export function ProductResearchStrip({
  title,
  description,
  groups,
  id,
  signatureLabel = "Opening brief",
  signatureNote,
}: {
  title: string;
  description?: string;
  groups: ProductResearchStripGroup[];
  id?: string;
  signatureLabel?: string;
  signatureNote?: ReactNode;
}) {
  return (
    <ProductCard id={id} tone="primary" className="space-y-3.5">
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.52fr)] lg:items-start">
        <ProductSectionTitle title={title} description={description} eyebrow="Research summary" />
        <div className="rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(27,58,107,0.04),rgba(255,255,255,0.88))] px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p className="riddra-product-body text-[11px] font-medium tracking-[0.08em] text-[#1B3A6B]">
            {signatureLabel}
          </p>
          <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.9)]">
            {signatureNote ??
              "A compact opening read that brings the first useful numbers, route posture, and comparison anchors together before the deeper sections."}
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group, index) => (
          <div
            key={`${group.title}-${group.note ?? ""}`}
            className={clsx(
              "rounded-[11px] border px-3.5 py-3 shadow-[0_10px_18px_rgba(27,58,107,0.024)] sm:px-4 sm:py-3.5",
              researchStripAccentClasses[index % researchStripAccentClasses.length],
            )}
          >
            {group.eyebrow ? (
              <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">
                {group.eyebrow}
              </p>
            ) : null}
            <p className="riddra-product-body mt-1 text-sm font-semibold text-[#1B3A6B]">{group.title}</p>
            {group.note ? (
              <p className="riddra-product-body mt-1.5 text-xs leading-5 text-[rgba(107,114,128,0.84)]">
                {group.note}
              </p>
            ) : null}
            <div className="mt-3 space-y-2.5 border-t border-[rgba(226,222,217,0.82)] pt-3">
              {group.items.map((item, index) => (
                <div
                  key={`${group.title}-${item.label}`}
                  className={clsx(
                    index === 0
                      ? "rounded-[9px] border border-[rgba(27,58,107,0.1)] bg-[rgba(27,58,107,0.03)] px-3 py-2.5"
                      : "flex items-start justify-between gap-3",
                  )}
                >
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
                    {item.label}
                  </p>
                  <p
                    className={clsx(
                      "riddra-product-number text-right font-medium text-[#1B3A6B]",
                      index === 0 ? "mt-1 text-[1.05rem]" : "text-sm",
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductReadingStrip({
  items,
}: {
  items: ProductReadingStripItem[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 rounded-[11px] border border-[rgba(226,222,217,0.84)] bg-[rgba(255,255,255,0.82)] px-3 py-3 sm:px-3.5 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.92fr)_minmax(0,0.93fr)]">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${item.value}`}
          className={clsx(
            "space-y-1.5",
            index === 0
              ? "col-span-2 rounded-[9px] border border-[rgba(27,58,107,0.1)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)] px-3 py-2.5 shadow-[0_8px_18px_rgba(27,58,107,0.025)] sm:col-span-1"
              : "min-w-0 rounded-[8px] border border-[rgba(226,222,217,0.74)] bg-white px-3 py-2.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:border-l sm:border-[rgba(226,222,217,0.78)] sm:pl-3.5",
          )}
        >
          <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.8)]">
            {item.label}
          </p>
          <p
            className={clsx(
              "riddra-product-number break-words font-medium text-[#1B3A6B]",
              index === 0 ? "text-[17px]" : "text-[15px]",
            )}
          >
            {item.value}
          </p>
          {item.helper ? (
            <p className="riddra-product-body text-xs leading-5 text-[rgba(107,114,128,0.84)]">{item.helper}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ProductDataTableCard({
  title,
  description,
  rows,
  tone = "secondary",
  eyebrow,
  id,
  variant = "default",
}: {
  title: string;
  description?: string;
  rows: ProductDataTableRow[];
  tone?: ProductCardTone;
  eyebrow?: string;
  id?: string;
  variant?: ProductDataTableVariant;
}) {
  const wrapperClassName =
    variant === "analysis"
      ? "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)]"
      : variant === "composition"
        ? "border-[rgba(107,114,128,0.16)] bg-[linear-gradient(180deg,rgba(246,246,244,0.95),#FFFFFF)]"
        : variant === "context"
          ? "border-[rgba(212,133,59,0.16)] bg-[linear-gradient(180deg,rgba(250,246,240,0.95),#FFFFFF)]"
          : "border-[rgba(226,222,217,0.82)] bg-white";

  return (
    <ProductCard id={id} tone={tone} className="space-y-3">
      <ProductSectionTitle title={title} description={description} eyebrow={eyebrow} />
      <div className={clsx("overflow-hidden rounded-[10px] border", wrapperClassName)}>
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${row.value}-${index}`}
            className={clsx(
              "grid gap-2.5 px-3.5 py-2.5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start",
              index === 0 && "bg-[rgba(27,58,107,0.028)]",
              index > 0 && "border-t border-[rgba(226,222,217,0.78)]",
            )}
          >
            <div>
              <p className="riddra-product-body text-[13px] font-medium text-[rgba(107,114,128,0.8)]">
                {row.label}
              </p>
              {row.helper ? (
                <p className="riddra-product-body mt-1 text-xs leading-5 text-[rgba(107,114,128,0.78)]">
                  {row.helper}
                </p>
              ) : null}
            </div>
            <p
              className={clsx(
                "riddra-product-number break-words font-medium text-[#1B3A6B] md:text-right",
                index === 0 ? "text-[16px]" : "text-[14px]",
              )}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductRouteGrid({
  title,
  description,
  items,
  eyebrow = "Related routes",
  id,
}: {
  title: string;
  description?: string;
  items: ProductRouteLink[];
  eyebrow?: string;
  id?: string;
}) {
  return (
    <ProductCard id={id} tone="secondary" className="space-y-4">
      <ProductSectionTitle title={title} description={description} eyebrow={eyebrow} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${item.href}-${item.title}`}
            className={clsx(
              "rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.045)]",
              index === 0 && "border-[rgba(27,58,107,0.16)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)]",
            )}
          >
            {item.eyebrow ? (
              <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.82)]">
                {item.eyebrow}
              </p>
            ) : null}
            <p className="riddra-product-body mt-2 text-base font-medium text-[#1B3A6B]">
              <Link href={item.href} className="transition hover:text-[#D4853B]">
                {item.title}
              </Link>
            </p>
            <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
              {item.description}
            </p>
            <div className="mt-3 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between min-[430px]:gap-3">
              {item.meta ? (
                <span className="riddra-product-body text-xs uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">
                  {item.meta}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductInsightGridCard({
  title,
  description,
  items,
  columns = 2,
  tone = "secondary",
  eyebrow,
  id,
  variant = "default",
}: {
  title: string;
  description?: string;
  items: ProductInsightItem[];
  columns?: 2 | 3;
  tone?: ProductCardTone;
  eyebrow?: string;
  id?: string;
  variant?: ProductInsightVariant;
}) {
  const cellClassName =
    variant === "analysis"
      ? "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)]"
      : variant === "quality"
        ? "border-[rgba(212,133,59,0.16)] bg-[linear-gradient(180deg,rgba(250,246,240,0.95),#FFFFFF)]"
        : variant === "composition"
          ? "border-[rgba(107,114,128,0.16)] bg-[linear-gradient(180deg,rgba(246,246,244,0.95),#FFFFFF)]"
          : variant === "signals"
            ? "border-[rgba(26,127,75,0.14)] bg-[linear-gradient(180deg,rgba(244,249,246,0.95),#FFFFFF)]"
            : "border-[rgba(226,222,217,0.82)] bg-white";

  return (
    <ProductCard id={id} tone={tone} className="space-y-3">
      <ProductSectionTitle title={title} description={description} eyebrow={eyebrow} />
      <div className={clsx("grid gap-2.5", columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {items.map((item, index) => (
          <div
            key={`${item.label}-${item.value}`}
            className={clsx(
              "rounded-[10px] border px-3.5 py-2.5",
              cellClassName,
              index === 0 && "shadow-[0_10px_18px_rgba(27,58,107,0.03)]",
            )}
          >
            <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
              {item.label}
            </p>
            <p
              className={clsx(
                "riddra-product-number mt-2 break-words font-medium text-[#1B3A6B]",
                index === 0 ? "text-[16px]" : "text-[14px]",
              )}
            >
              {item.value}
            </p>
            {item.note ? (
              <p className="riddra-product-body mt-1 text-[13px] leading-5 text-[rgba(107,114,128,0.88)]">
                {item.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductBulletListCard({
  title,
  description,
  items,
  tone = "compact",
  eyebrow,
  id,
  variant = "default",
}: {
  title: string;
  description?: string;
  items: ProductBulletItem[];
  tone?: ProductCardTone;
  eyebrow?: string;
  id?: string;
  variant?: ProductBulletListVariant;
}) {
  const wrapperClassName =
    variant === "watchpoints"
      ? "border-[rgba(212,133,59,0.16)] bg-[linear-gradient(180deg,rgba(250,246,240,0.95),#FFFFFF)]"
      : variant === "context"
        ? "border-[rgba(107,114,128,0.16)] bg-[linear-gradient(180deg,rgba(246,246,244,0.95),#FFFFFF)]"
        : variant === "checklist"
          ? "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)]"
          : "border-[rgba(226,222,217,0.82)] bg-white";

  return (
    <ProductCard id={id} tone={tone} className="space-y-3">
      <ProductSectionTitle title={title} description={description} eyebrow={eyebrow} />
      <div className={clsx("overflow-hidden rounded-[10px] border", wrapperClassName)}>
        {items.map((item, index) => (
          <div
            key={`${item.title ?? item.body}-${index}`}
            className={clsx("px-3 py-2.5", index > 0 && "border-t border-[rgba(226,222,217,0.78)]")}
          >
            <div className="flex items-start gap-2.5">
              {variant === "watchpoints" || variant === "checklist" ? (
                <span className="riddra-product-number inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(27,58,107,0.12)] bg-white text-[11px] text-[#1B3A6B]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <div className="min-w-0 space-y-0.5">
                {item.meta ? (
                  <p className="riddra-product-body text-[10px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.8)]">
                    {item.meta}
                  </p>
                ) : null}
            {item.title ? (
              <p className="riddra-product-body mt-0.5 text-[13px] font-medium text-[#1B3A6B]">{item.title}</p>
            ) : null}
            <p className="riddra-product-body mt-0.5 text-[13px] leading-5 text-[rgba(107,114,128,0.88)]">
              {item.body}
            </p>
            {item.href && item.hrefLabel ? (
              <Link
                href={item.href}
                className="riddra-product-body mt-1.5 inline-flex text-[13px] font-medium text-[#1B3A6B] transition hover:text-[#D4853B]"
              >
                {item.hrefLabel}
              </Link>
            ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}

export function ProductRouteRailCard({
  title,
  description,
  items,
  eyebrow = "Route handoffs",
  id,
  variant = "default",
}: {
  title: string;
  description?: string;
  items: ProductRouteLink[];
  eyebrow?: string;
  id?: string;
  variant?: ProductRouteRailVariant;
}) {
  const wrapperClassName =
    variant === "routes"
      ? "border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#FFFFFF)]"
      : "border-[rgba(226,222,217,0.82)] bg-white";

  return (
    <ProductCard id={id} tone="compact" className="space-y-3">
      <ProductSectionTitle title={title} description={description} eyebrow={eyebrow} />
      <div className={clsx("overflow-hidden rounded-[10px] border", wrapperClassName)}>
        {items.map((item, index) => (
          <div
            key={`${item.href}-${item.title}`}
            className={clsx(
              "px-3 py-2.5",
              index > 0 && "border-t border-[rgba(226,222,217,0.78)]",
            )}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="space-y-0.5">
                {item.eyebrow ? (
                  <p className="riddra-product-body text-[10px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.8)]">
                    {item.eyebrow}
                  </p>
                ) : null}
                <p className="riddra-product-body text-[13px] font-medium text-[#1B3A6B]">
                  <Link href={item.href} className="transition hover:text-[#D4853B]">
                    {item.title}
                  </Link>
                </p>
                <p className="riddra-product-body text-[13px] leading-5 text-[rgba(107,114,128,0.88)]">
                  {item.description}
                </p>
              </div>
              {item.meta ? (
                <span className="riddra-product-body text-[10px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)] sm:text-right">
                  {item.meta}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ProductCard>
  );
}
