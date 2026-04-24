import { getTransactionalDeliveryReadiness } from "@/lib/durable-jobs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export type ReleaseCheckStatus = "Ready" | "In progress" | "Blocked";

export type ReleaseCheckRoute = {
  label: string;
  href: string;
  status: ReleaseCheckStatus;
  note: string;
};

export type ReleaseCheckLane = {
  title: string;
  status: ReleaseCheckStatus;
  summary: string;
  routes: ReleaseCheckRoute[];
};

export type ReleaseCheckRegistryRow = {
  lane: string;
  laneStatus: ReleaseCheckStatus;
  label: string;
  href: string;
  status: ReleaseCheckStatus;
  note: string;
};

const runtimeConfig = getRuntimeLaunchConfig();
const delivery = getTransactionalDeliveryReadiness();
const hasProviderSync = Boolean(runtimeConfig.marketDataProviderUrl && (runtimeConfig.marketDataRefreshSecret || runtimeConfig.cronSecret));
const hasSupportDelivery = delivery.configured;
const hasBillingCore = Boolean(runtimeConfig.razorpayKeyId && runtimeConfig.razorpayKeySecret);

function countStatuses(lanes: ReleaseCheckLane[]) {
  const allRoutes = lanes.flatMap((lane) => lane.routes);

  return {
    ready: allRoutes.filter((route) => route.status === "Ready").length,
    inProgress: allRoutes.filter((route) => route.status === "In progress").length,
    blocked: allRoutes.filter((route) => route.status === "Blocked").length,
  };
}

export const releaseCheckLanes: ReleaseCheckLane[] = [
  {
    title: "Public discovery journey",
    status: "In progress",
    summary:
      "The public front door is strong enough for walkthroughs now, but the launch pass should still re-check market discovery, search, pricing, and trust routes as one real acquisition flow.",
    routes: [
      {
        label: "Homepage",
        href: "/",
        status: "Ready",
        note: "Homepage is now market-first and no longer leaks tracker or phase clutter.",
      },
      {
        label: "Markets",
        href: "/markets",
        status: "Ready",
        note: "Markets is one of the strongest public discovery surfaces and now carries commodity cards too.",
      },
      {
        label: "Search",
        href: "/search",
        status: "Ready",
        note: "Search has grouped route handoffs and compare-aware intent, so it is no longer just a ranked list shell.",
      },
      {
        label: "Pricing",
        href: "/pricing",
        status: "In progress",
        note: "Pricing copy is more believable now, but paid conversion truth still depends on real billing activation.",
      },
      {
        label: "Launch readiness and trust pages",
        href: "/launch-readiness",
        status: hasSupportDelivery ? "In progress" : "Blocked",
        note: hasSupportDelivery
          ? "Trust surfaces read more calmly now, and the next work is verifying them as part of the whole acquisition path."
          : "Support and transactional delivery still need activation before trust claims can be exercised under traffic.",
      },
    ],
  },
  {
    title: "Research and decision journey",
    status: "In progress",
    summary:
      "Stock, compare, chart, and index routes now feel much closer to a real market product, but launch confidence still depends on checking them together with source-state honesty.",
    routes: [
      {
        label: "Stocks hub",
        href: "/stocks",
        status: "Ready",
        note: "The stock library now has broader coverage and better quote-state labeling for the main routes.",
      },
      {
        label: "Tata Motors stock route",
        href: "/stocks/tata-motors",
        status: "In progress",
        note: "This route now has a corrected delayed close, but full live-source truth still depends on the provider feed.",
      },
      {
        label: "HDFC Bank vs ICICI Bank compare",
        href: "/compare/stocks/hdfc-bank/icici-bank",
        status: "Ready",
        note: "The compare route is demo-strong now and the duplicate-key bug is fixed.",
      },
      {
        label: "Index routes",
        href: "/nifty50",
        status: hasProviderSync ? "In progress" : "Blocked",
        note: hasProviderSync
          ? "Index pages now have stronger breadth and constituent layers, but official-source automation still needs follow-through."
          : "Index trust is still bounded by seeded and manual-reference layers until provider sync is active.",
      },
      {
        label: "Chart route",
        href: "/stocks/tata-motors/chart",
        status: "In progress",
        note: "TradingView is embedded cleanly now, but the source-backed chart truth layer still needs full provider confirmation.",
      },
    ],
  },
  {
    title: "Auth and subscriber journey",
    status: "In progress",
    summary:
      "The app now separates public and admin surfaces much better, and premium trader routes are genuinely gated, but broad subscriber truth still needs billing and communication validation.",
    routes: [
      {
        label: "Login",
        href: "/login",
        status: "Ready",
        note: "The login route is healthy and the copy no longer sounds like build-mode narration.",
      },
      {
        label: "Signup",
        href: "/signup",
        status: "Ready",
        note: "Signup is stable and now reads like a real public route rather than a placeholder gate.",
      },
      {
        label: "Account access",
        href: "/account/access",
        status: "Ready",
        note: "Account access now shows required-plan messaging and acts as the upgrade handoff for gated routes.",
      },
      {
        label: "Trader workstation gate",
        href: "/trader-workstation",
        status: "Ready",
        note: "Trader workstation and linked premium routes now require Pro-tier access instead of remaining fully open.",
      },
      {
        label: "Billing workspace",
        href: "/account/billing",
        status: hasBillingCore ? "In progress" : "Blocked",
        note: hasBillingCore
          ? "Billing surfaces are ready for validation, but checkout and webhook-confirmed state still need a full pass."
          : "Billing posture is still blocked until live Razorpay credentials are configured.",
      },
    ],
  },
  {
    title: "Launch-control journey",
    status: "In progress",
    summary:
      "The operator stack is broad and real now, but launch confidence still depends on reviewing smoke tests, mobile QA, incident readiness, and go/no-go together instead of as isolated pages.",
    routes: [
      {
        label: "Phase execution board",
        href: "/admin/phase-execution-board",
        status: "Ready",
        note: "The still-open phases now have one operator board instead of drifting across separate desks.",
      },
      {
        label: "Release checks",
        href: "/admin/release-checks",
        status: "Ready",
        note: "This page now acts as a real route-by-route launch matrix instead of a generic checklist shell.",
      },
      {
        label: "Public launch QA",
        href: "/admin/public-launch-qa",
        status: "In progress",
        note: "QA lanes are visible, but they still need one tighter verification pass across public, subscriber, and mobile flows.",
      },
      {
        label: "Live smoke tests",
        href: "/admin/live-smoke-tests",
        status: hasSupportDelivery && hasProviderSync ? "In progress" : "Blocked",
        note:
          hasSupportDelivery && hasProviderSync
            ? "The smoke-test surface is ready for a fuller run once operator time is allocated."
            : "Smoke-test truth is still partially blocked until support delivery and market-data sync are both credible.",
      },
      {
        label: "Go / No-Go",
        href: "/admin/go-no-go",
        status: hasProviderSync && hasSupportDelivery ? "In progress" : "Blocked",
        note:
          hasProviderSync && hasSupportDelivery
            ? "The launch-decision stack is present and now needs a final practical review sequence."
            : "The final launch call should stay blocked until source sync and support credibility are both real.",
      },
    ],
  },
];

const releaseRouteCounts = countStatuses(releaseCheckLanes);

export const releaseChecksSummary = {
  releaseLanes: releaseCheckLanes.length,
  criticalJourneys: releaseCheckLanes.reduce((sum, lane) => sum + lane.routes.length, 0),
  signoffLayers: 4,
  readyRoutes: releaseRouteCounts.ready,
  inProgressRoutes: releaseRouteCounts.inProgress,
  blockedRoutes: releaseRouteCounts.blocked,
};

export const releaseCheckRegistryRows: ReleaseCheckRegistryRow[] = releaseCheckLanes.flatMap((lane) =>
  lane.routes.map((route) => ({
    lane: lane.title,
    laneStatus: lane.status,
    label: route.label,
    href: route.href,
    status: route.status,
    note: route.note,
  })),
);

export function toReleaseCheckCsv(rows: ReleaseCheckRegistryRow[]) {
  const columns = ["lane", "lane_status", "label", "href", "status", "note"];
  const dataRows = rows.map((row) =>
    [row.lane, row.laneStatus, row.label, row.href, row.status, row.note]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}

export const releaseCheckRules = [
  "A successful build is necessary but not enough for release confidence.",
  "Critical user journeys should be rechecked as journeys, not only as isolated pages.",
  "The go / no-go call should only happen after public, research, subscriber, and operator journeys have all been reviewed together.",
];
