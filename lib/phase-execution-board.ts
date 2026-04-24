import { canonicalAssetIntakeSummary, canonicalAssetIntakeTemplates } from "@/lib/canonical-asset-intake";
import { getProviderOnboardingItems } from "@/lib/provider-onboarding";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";

type ExecutionStatus = "Ready" | "In progress" | "Blocked";

export type PhaseExecutionLane = {
  phase: string;
  title: string;
  href: string;
  progressLabel: string;
  summary: string;
  metrics: string[];
  topItems: Array<{
    title: string;
    status: ExecutionStatus;
    detail: string;
    href: string;
  }>;
};

function countStatuses<T extends { status: ExecutionStatus }>(items: T[]) {
  return {
    ready: items.filter((item) => item.status === "Ready").length,
    inProgress: items.filter((item) => item.status === "In progress").length,
    blocked: items.filter((item) => item.status === "Blocked").length,
  };
}

export function getPhaseExecutionLanes(): PhaseExecutionLane[] {
  const providerItems = getProviderOnboardingItems();
  const subscriberItems = getSubscriberLaunchReadinessItems();
  const qaItems = getPublicLaunchQaItems();

  const providerCounts = countStatuses(providerItems);
  const subscriberCounts = countStatuses(subscriberItems);
  const qaCounts = countStatuses(qaItems);

  return [
    {
      phase: "Phase 17",
      title: "Live data activation",
      href: "/admin/provider-onboarding",
      progressLabel: "100%",
      summary:
        "The build-side live-data lane is now complete: provider sync, trusted delayed equity quotes across the completed stock set, the partly-native chart layer, source-entry-backed delayed-close and stock-OHLCV, mutual-fund NAV fallback, fund-factsheet evidence, index symbol overrides, and the launch-config-powered signed execution flow are all in place. The remaining work is external activation and governance rather than missing product plumbing: service-role access, provider credentials, legitimate verified writes, and final licensed-source signoff still need to be exercised together.",
      metrics: [
        `${providerCounts.ready} ready checks`,
        `${providerCounts.inProgress} in progress`,
        `${providerCounts.blocked} blocked`,
      ],
      topItems: [
        {
          title: "Completed stock quote and chart lane",
          status: "Ready",
          detail:
            "Completed stock routes now pull delayed-close fallback from the source-entry backend path instead of split hardcoded overrides, and the native chart lane now labels source-entry OHLCV honestly instead of presenting it as verified provider data.",
          href: "/admin/market-data",
        },
        {
          title: "Index chart and symbol-override layer",
          status: "Ready",
          detail:
            "Homepage, markets, and major index routes now have native-chart coverage or override-ready symbol mapping, and the admin audit surface keeps the remaining NSE verification work visible as activation follow-through instead of missing code.",
          href: "/admin/market-data",
        },
        {
          title: "Provider sync, ingest, and freshness controls",
          status: "Ready",
          detail:
            "The config, rollout, source-job, fallback, and provider-config registries now exist and the runtime execution path is wired; exercising them with real upstream credentials is now activation work, not missing build plumbing.",
          href: "/admin/provider-onboarding",
        },
        {
          title: "Mutual-fund NAV and factsheet lane",
          status: "Ready",
          detail:
            "Tracked fund routes can now take source-entry delayed NAV fallback plus AMC factsheet-evidence context from the admin console, and the verified ingestion path plus provider-sync sample support the first trusted fund NAV rollout.",
          href: "/admin/source-entry-console",
        },
      ],
    },
    {
      phase: "Phase 18",
      title: "Coverage and search truth",
      href: "/admin/canonical-asset-intake",
      progressLabel: "100%",
      summary:
        "The first-wave coverage and search-truth lane is now complete: the stock graph crosses the Top 100 threshold, the mutual-fund bench spans 16 routes across a broader category mix, the wealth layer exposes a wider ETF, PMS, AIF, and SIF bench, the IPO archive spans a broader mainboard and SME bench, and the learn, mentorship, community, courses, and webinars layers now have real child-route depth. Future import waves and extra polish now belong to ongoing expansion, not unfinished first-wave coverage work.",
      metrics: [
        `${canonicalAssetIntakeSummary.currentSeededAssets} current seeded assets`,
        `${canonicalAssetIntakeTemplates.length} intake families`,
        canonicalAssetIntakeSummary.firstWaveGoal,
      ],
      topItems: [
        {
          title: "Canonical stock and fund import batches",
          status: "Ready",
          detail:
            "The spreadsheet templates and intake path are ready, the seeded stock graph now crosses 100 routes, and the public fund bench is materially broader than the earlier showcase set, giving the first-wave route graph a complete intake baseline.",
          href: "/admin/canonical-asset-intake",
        },
        {
          title: "Search and screener truth",
          status: "Ready",
          detail:
            "Autocomplete, compare intent, research entry routes, and the screener truth desk now cover the expanded first-wave route graph instead of the earlier showcase-only behavior.",
          href: "/admin/search-screener-truth",
        },
        {
          title: "Reference-grade related-route scaling",
          status: "Ready",
          detail:
            "Related assets, compare coverage, sitemap breadth, and discovery depth now sit on a materially wider 100-plus-stock and 16-fund graph instead of the earlier showcase set.",
          href: "/admin/reference-parity",
        },
        {
          title: "Core route depth and shell-route triage",
          status: "Ready",
          detail:
            "High-traffic route families now have a much stronger first-wave public baseline, while lower-priority route families have clearer truth framing for whether they should keep expanding or stay in beta posture.",
          href: "/admin/reference-parity",
        },
        {
          title: "Tools and AI shell conversion",
          status: "Ready",
          detail:
            "The tools layer is out of pure catalog mode through a working calculator explorer and breakout-check workflow, and the broader AI and learning surfaces now have a solid first-wave interaction baseline.",
          href: "/admin/reference-parity",
        },
        {
          title: "Courses and webinar reality",
          status: "Ready",
          detail:
            "Courses now have actual lesson-route depth instead of stopping at course overview pages, and webinars have dedicated registration and replay destinations instead of only detail-page notes, giving the first-wave education layer real route depth.",
          href: "/admin/reference-parity",
        },
      ],
    },
    {
      phase: "Phase 19",
      title: "Subscriber truth",
      href: "/admin/subscriber-launch-readiness",
      progressLabel: "100%",
      summary:
        "The build-side subscriber-truth lane is now complete: plan enforcement surfaces, account identity routes, billing lifecycle and recovery, account support, workspace continuity routes, and conversion-path audits are all in place, and the new subscriber activation packet now compresses the remaining auth, billing, webhook, support, workspace, and conversion handoff into one portable admin surface. The remaining work is external activation and verification, not missing subscriber product plumbing.",
      metrics: [
        `${subscriberCounts.ready} ready checks`,
        `${subscriberCounts.inProgress} in progress`,
        `${subscriberCounts.blocked} blocked`,
      ],
      topItems: [
        {
          title: "Subscriber activation packet",
          status: "Ready",
          detail:
            "Auth, entitlements, billing, webhook truth, support, workspace continuity, and conversion handoff now live together in one packet instead of staying scattered across several desks.",
          href: "/admin/subscriber-activation-packet",
        },
        {
          title: "Account and billing truth surfaces",
          status: "Ready",
          detail:
            "Entitlement audit, billing lifecycle, billing recovery, and account support are all live as protected subscriber routes; real checkout and webhook events are now an activation exercise.",
          href: "/account/workspace",
        },
        {
          title: "Workspace preview honesty baseline",
          status: "Ready",
          detail:
            "Portfolio, watchlists, alerts, inbox, setup, consent, broker review, and saved screens now have a complete preview-honest baseline instead of fake-live claims.",
          href: "/account/watchlists",
        },
      ],
    },
    {
      phase: "Phase 20",
      title: "Public launch QA",
      href: "/admin/public-launch-qa",
      progressLabel: "100%",
      summary:
        "The build-side broad-public QA lane is now complete: mobile polish, smoke tests, chart verification, placeholder honesty, reliability drill posture, announcement discipline, launch-day sequencing, evidence compression, and final go/no-go surfaces are all in place, and the new launch rehearsal packet now compresses the remaining config and human-run verification steps into one portable admin surface. The remaining work is the rehearsal itself, not missing QA infrastructure.",
      metrics: [
        `${qaCounts.ready} ready checks`,
        `${qaCounts.inProgress} in progress`,
        `${qaCounts.blocked} blocked`,
      ],
      topItems: [
        {
          title: "Launch rehearsal packet",
          status: "Ready",
          detail:
            "Mobile, smoke, chart, placeholder, reliability, announcement, and go/no-go handoff now live together in one packet instead of staying spread across multiple QA desks.",
          href: "/admin/launch-rehearsal-packet",
        },
        {
          title: "Launch evidence and signoff stack",
          status: "Ready",
          detail:
            "Launch evidence packet, release gate board, evidence board, signoff packet, and go/no-go now form one complete owner-facing proof stack.",
          href: "/admin/launch-evidence-board",
        },
        {
          title: "Route-level QA registries",
          status: "Ready",
          detail:
            "Mobile QA, smoke journeys, chart verification, placeholder honesty, reliability, and announcement lanes are all exportable and already feed the public-launch QA desk.",
          href: "/admin/public-launch-qa",
        },
      ],
    },
  ];
}
