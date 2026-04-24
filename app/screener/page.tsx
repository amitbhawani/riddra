import type { Metadata } from "next";
import { ScreenerWorkspace } from "../../components/screener-workspace";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getStocks } from "@/lib/content";
import { buildScreenerRows } from "@/lib/screener";
import {
  screenerMetricGroupIds,
  screenerSortOptions,
  type ScreenerMetricGroupId,
  type ScreenerSectorFilter,
  type ScreenerSortOption,
  type ScreenerTruthFilter,
} from "@/lib/screener-search";

const savedStacks = [
  {
    title: "All route-backed stocks",
    summary: "Start from the full searchable stock universe so the first screener view reflects actual route coverage before you narrow into a preset idea stack.",
    filters: [],
  },
  {
    title: "Quality balance sheets",
    summary: "High-ROE names with lighter leverage and meaningful market-cap context from the route-backed snapshot layer.",
    filters: ["ROE > 18%", "Debt / Equity < 0.4", "Market Cap > ₹50,000 Cr"],
  },
  {
    title: "Range leaders",
    summary: "Stocks already trading in the upper part of their 52-week range with a positive day move and enough size to matter in a walkthrough.",
    filters: ["Upper range or near highs", "Price move > 0%", "Market Cap > ₹50,000 Cr"],
  },
  {
    title: "Banking quality",
    summary:
      "Banking names with stronger profitability and meaningful scale, using the route-backed fields Riddra can defend today instead of pretending debt-to-equity works like a generic non-financial screen.",
    filters: ["Sector: Banking", "ROE > 15%", "Market Cap > ₹50,000 Cr"],
  },
  {
    title: "Banking leaders",
    summary: "A fast bank-shortlist view built from the route-backed sector field plus today’s tape and available quality markers.",
    filters: ["Sector: Banking", "Price move > 0%", "ROE > 15%"],
  },
];

const metricGroups: Array<{ id: ScreenerMetricGroupId; title: string; items: string[] }> = [
  {
    id: "route-backed-fundamentals",
    title: "Route-backed fundamentals",
    items: ["ROE", "Debt / Equity", "Market Cap", "52W position"],
  },
  {
    id: "market-snapshot",
    title: "Market snapshot",
    items: ["CMP", "1D move", "Sector", "Snapshot truth label"],
  },
  {
    id: "decision-handoff",
    title: "Decision handoff",
    items: ["Stock route", "Chart route", "Compare route", "Rationale card"],
  },
  {
    id: "pending-metric-lanes",
    title: "Pending metric lanes",
    items: ["Sales growth feed", "Ownership trend feed", "Volume history", "Event-backed signals"],
  },
];

const workflowLanes = [
  {
    title: "Discovery lane",
    summary: "Start with broad saved stacks, sector themes, and benchmark-relative ideas before narrowing by valuation or trend.",
  },
  {
    title: "Decision lane",
    summary: "Promote shortlist names into compare, chart, earnings-watch, and event-risk workflows without rebuilding the filter logic.",
  },
  {
    title: "Subscriber lane",
    summary: "Save screens, route them into alerts, and connect them to watchlists, option-chain context, or portfolio validation.",
  },
];

export const metadata: Metadata = {
  title: "Screener",
  description: "Riddra screener with saved stacks, truth-aware filters, intent-aware search, sortable results, and research-ready result framing.",
};

type PageProps = {
  searchParams: Promise<{
    query?: string;
    sector?: ScreenerSectorFilter;
    truth?: ScreenerTruthFilter;
    compare?: string;
    stack?: string;
    metric?: ScreenerMetricGroupId;
    sort?: ScreenerSortOption;
  }>;
};

export default async function ScreenerPage({ searchParams }: PageProps) {
  const { query = "", sector, truth, compare, stack, metric, sort } = await searchParams;
  const results = buildScreenerRows(await getStocks());
  const initialMetricGroup = metric && screenerMetricGroupIds.includes(metric) ? metric : null;
  const initialSortBy = sort && screenerSortOptions.includes(sort) ? sort : null;

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Reference-grade screener direction</Eyebrow>
          <SectionHeading
            title="Screener"
            description="Filter the market with saved stacks, refine by sector and truth state, use natural-language search for sector and metric intent, and jump straight into the stocks and charts worth deeper review."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Screener truth"
          title="This screener is useful for discovery, but deeper continuity still depends on launch activation"
          description="Use the screener confidently for public and subscriber discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry screened ideas into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full screener-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium screener and saved-workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium screener promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for screened ideas that convert into subscriber workflows."
          supportPending="Support delivery is still not fully active, so screener routes should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <ScreenerWorkspace
          savedStacks={savedStacks}
          metricGroups={metricGroups}
          rows={results}
          initialSearchTerm={query}
          initialSectorFilter={sector}
          initialTruthFilter={truth}
          initialCompareOnly={compare === "1"}
          initialStack={stack}
          initialMetricGroup={initialMetricGroup}
          initialSortBy={initialSortBy}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Truth layer</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Screener rows now come from the same stock records that power the live routes, and each saved stack is limited to metrics the app can actually support today. Sector, truth-state, compare-ready, and sort controls now sit alongside intent-aware free-text search, including thematic filters such as Financials when the query spans banks, NBFCs, and insurers, so queries like banking high roe or financial leaders behave more like a real research workflow without pretending unsupported bank-leverage math or pending factor history already exists.
          </p>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          {workflowLanes.map((lane) => (
            <GlowCard key={lane.title}>
              <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{lane.summary}</p>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
