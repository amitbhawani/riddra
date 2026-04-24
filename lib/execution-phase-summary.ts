import { getProviderOnboardingItems } from "@/lib/provider-onboarding";
import { canonicalAssetIntakeSummary, canonicalAssetIntakeTemplates } from "@/lib/canonical-asset-intake";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";

export type ExecutionPhaseSummary = {
  phase: string;
  title: string;
  progressLabel: string;
  href: string;
  detail: string;
  metrics: string[];
};

function countStatuses<T extends { status: string }>(items: T[]) {
  return {
    ready: items.filter((item) => item.status === "Ready").length,
    inProgress: items.filter((item) => item.status === "In progress").length,
    blocked: items.filter((item) => item.status === "Blocked").length,
  };
}

export function getExecutionPhaseSummaries(): ExecutionPhaseSummary[] {
  const provider = countStatuses(getProviderOnboardingItems());
  const subscriber = countStatuses(getSubscriberLaunchReadinessItems());
  const qa = countStatuses(getPublicLaunchQaItems());

  return [
    {
      phase: "Phase 17",
      title: "Live data activation",
      progressLabel: "100%",
      href: "/admin/provider-onboarding",
      detail: "The build-side Phase 17 lane is now complete: saved launch-config values feed the real provider-sync, ingest, refresh, and admin-write server flow, the full first trusted stock set can promote into an honest native chart state through the source-entry OHLCV lane instead of only a Tata-only chart path, tracked mutual-fund routes can take source-entry delayed NAV fallback plus AMC factsheet-evidence context from the admin console, and the refresh rehearsal covers the full first trusted stock quote set plus the first trusted fund NAV set instead of only a tiny partial demo. What remains now is external activation and governance: service-role Supabase access, provider URL plus token, legitimate verified writes, and final licensed-source signoff.",
      metrics: [
        `${provider.ready} ready checks`,
        `${provider.inProgress} in progress`,
        `${provider.blocked} blocked`,
      ],
    },
    {
      phase: "Phase 18",
      title: "Coverage and search truth",
      progressLabel: "100%",
      href: "/admin/canonical-asset-intake",
      detail: "The first-wave Phase 18 lane is now complete: canonical coverage drives route export, sitemap asset discovery, compare-route registry coverage, an exportable search-index registry, a downloadable source-mapping registry, a dedicated screener-metric registry, and a reference-parity registry, the public stock graph now crosses the Top 100 first-wave threshold, the mutual-fund bench spans 16 real routes across a much broader category mix, the wealth layer exposes a visibly broader ETF, PMS, AIF, and SIF bench, the IPO archive spans a broader mainboard plus SME bench, and the learning layer includes real persona-track pages, event-archive detail routes, mentorship plus community child routes, and dedicated webinar registration plus replay pages instead of stopping at overview cards. Future import waves now belong to ongoing expansion rather than unfinished first-wave build work.",
      metrics: [
        `${canonicalAssetIntakeSummary.currentRouteCoverage} tracked routes`,
        `${canonicalAssetIntakeTemplates.length} import families`,
        canonicalAssetIntakeSummary.firstWaveGoal,
      ],
    },
    {
      phase: "Phase 19",
      title: "Subscriber truth",
      progressLabel: "100%",
      href: "/admin/subscriber-launch-readiness",
      detail: "The build-side Phase 19 lane is now complete: subscriber account, entitlement, billing, support, workspace, and conversion-path surfaces are all in place, the account layer includes dedicated protected routes for entitlement audit, billing lifecycle, billing recovery, and account support, and the new subscriber activation packet now compresses the remaining auth, billing, webhook, support, workspace, and conversion handoff into one portable admin surface. What remains is external activation and rehearsal: real auth beyond the local bypass, real Razorpay checkout, webhook-confirmed entitlements, transactional delivery sends, and durable subscriber-memory verification.",
      metrics: [
        `${subscriber.ready} ready checks`,
        `${subscriber.inProgress} in progress`,
        `${subscriber.blocked} blocked`,
      ],
    },
    {
      phase: "Phase 20",
      title: "Public launch QA",
      progressLabel: "100%",
      href: "/admin/public-launch-qa",
      detail: "The build-side Phase 20 lane is now complete: mobile QA, smoke journeys, chart verification, placeholder honesty, reliability or rollback drill posture, announcement readiness, launch-day sequencing, and final go/no-go now all live in dedicated registries, desks, boards, and the new launch rehearsal packet. What remains is config completion plus one deliberate human rehearsal across mobile, smoke, chart, support, subscriber truth, and final owner signoff with live activated inputs.",
      metrics: [
        `${qa.ready} ready checks`,
        `${qa.inProgress} in progress`,
        `${qa.blocked} blocked`,
      ],
    },
  ];
}
