import { getConversionPathAuditItems } from "@/lib/conversion-path-audit";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getProviderOnboardingItems } from "@/lib/provider-onboarding";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";
import { getTrustSignoffItems } from "@/lib/trust-signoff";

type LaunchStatus = "Ready" | "In progress" | "Blocked" | "Deferred";

export type LaunchDayConsoleLane = {
  title: string;
  description: string;
  status: LaunchStatus;
  readyCount: number;
  inProgressCount: number;
  blockedCount: number;
  deferredCount: number;
  href: string;
  topBlocker: string;
};

export type LaunchDayConsoleSummary = {
  status: LaunchStatus;
  readyCount: number;
  inProgressCount: number;
  blockedCount: number;
  deferredCount: number;
  lanes: LaunchDayConsoleLane[];
  urgentBlockers: string[];
};

function summarizeLane(
  title: string,
  description: string,
  href: string,
  items: Array<{ title: string; status: LaunchStatus }>,
): LaunchDayConsoleLane {
  const readyCount = items.filter((item) => item.status === "Ready").length;
  const inProgressCount = items.filter((item) => item.status === "In progress").length;
  const blockedCount = items.filter((item) => item.status === "Blocked").length;
  const deferredCount = items.filter((item) => item.status === "Deferred").length;
  const topBlocker =
    items.find((item) => item.status === "Blocked")?.title ??
    items.find((item) => item.status === "In progress")?.title ??
    items.find((item) => item.status === "Deferred")?.title ??
    "This lane is fully launch-ready.";

  return {
    title,
    description,
    href,
    readyCount,
    inProgressCount,
    blockedCount,
    deferredCount,
    status: blockedCount > 0 ? "Blocked" : inProgressCount > 0 ? "In progress" : deferredCount > 0 ? "Deferred" : "Ready",
    topBlocker,
  };
}

export function getLaunchDayConsoleSummary(): LaunchDayConsoleSummary {
  const lanes = [
    summarizeLane(
      "Provider and live-data activation",
      "Make the first trusted stock-set, index, and refresh commitments real before launch-day market claims become public promises.",
      "/admin/provider-onboarding",
      getProviderOnboardingItems(),
    ),
    summarizeLane(
      "Subscriber and billing truth",
      "Confirm plans, checkout, webhooks, entitlements, and post-payment continuity before outside users are asked to pay or rely on gated access.",
      "/admin/subscriber-launch-readiness",
      getSubscriberLaunchReadinessItems(),
    ),
    summarizeLane(
      "Conversion path confidence",
      "Review the real route sequence from discovery to signup to setup to protected workspace so launch confidence is based on a full journey.",
      "/admin/conversion-path-audit",
      getConversionPathAuditItems(),
    ),
    summarizeLane(
      "Trust and public commitments",
      "Keep support, legal posture, launch messaging, and commitment discipline aligned with the product's real operational capacity.",
      "/admin/trust-signoff",
      getTrustSignoffItems(),
    ),
    summarizeLane(
      "Broad-public QA and mobile discipline",
      "Complete the mobile pass, smoke flows, incident drill, and final go/no-go checks that separate a calm release from a scramble.",
      "/admin/public-launch-qa",
      getPublicLaunchQaItems(),
    ),
    summarizeLane(
      "Cross-lane launch commitments",
      "Use one shared view of auth, payment, support, provider, and trust blockers so the last-mile launch call is based on one consistent truth layer.",
      "/admin/launch-commitments",
      getLaunchCommitmentItems(),
    ),
  ];

  const readyCount = lanes.reduce((sum, lane) => sum + lane.readyCount, 0);
  const inProgressCount = lanes.reduce((sum, lane) => sum + lane.inProgressCount, 0);
  const blockedCount = lanes.reduce((sum, lane) => sum + lane.blockedCount, 0);
  const deferredCount = lanes.reduce((sum, lane) => sum + lane.deferredCount, 0);
  const urgentBlockers = lanes.filter((lane) => lane.blockedCount > 0).map((lane) => `${lane.title}: ${lane.topBlocker}`);

  return {
    status: blockedCount > 0 ? "Blocked" : inProgressCount > 0 ? "In progress" : deferredCount > 0 ? "Deferred" : "Ready",
    readyCount,
    inProgressCount,
    blockedCount,
    deferredCount,
    lanes,
    urgentBlockers,
  };
}
