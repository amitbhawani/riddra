import { getLaunchApprovals } from "@/lib/launch-approvals";
import { getChartVerificationRows } from "@/lib/chart-verification-registry";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getLaunchDecision } from "@/lib/launch-decision";
import { getPlaceholderHonestyRows } from "@/lib/placeholder-honesty-registry";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";
import { launchControlItems } from "@/lib/launch-control";

export type LaunchBlockerLedgerItem = {
  title: string;
  owner: string;
  source: string;
  href: string;
  detail: string;
};

export function getLaunchBlockerLedger() {
  const controlItems: LaunchBlockerLedgerItem[] = launchControlItems
    .filter((item) => item.status === "Blocked")
    .map((item) => ({
      title: item.title,
      owner: item.owner,
      source: "Launch control",
      href: "/admin/launch-control",
      detail: item.note,
    }));

  const commitmentItems: LaunchBlockerLedgerItem[] = getLaunchCommitmentItems()
    .filter((item) => item.status === "Blocked")
    .map((item) => ({
      title: item.title,
      owner: "Shared",
      source: "Launch commitments",
      href: item.href,
      detail: item.detail,
    }));

  const decisionItems: LaunchBlockerLedgerItem[] = getLaunchDecision()
    .blockers.filter((item) => item.status === "Blocking")
    .map((item) => ({
      title: item.title,
      owner: "Shared",
      source: "Launch decision",
      href: "/admin/launch-decision",
      detail: item.detail,
    }));

  const approvalItems: LaunchBlockerLedgerItem[] = getLaunchApprovals()
    .approvals.filter((item) => item.status === "Pending")
    .map((item) => ({
      title: item.lane,
      owner: item.owner,
      source: "Launch approvals",
      href: "/admin/launch-approvals",
      detail: item.detail,
    }));

  const qaItems: LaunchBlockerLedgerItem[] = getPublicLaunchQaItems()
    .filter((item) => item.status === "Blocked")
    .map((item) => ({
      title: item.title,
      owner: "Shared",
      source: "Public launch QA",
      href: item.href,
      detail: item.note,
    }));

  const placeholderItems: LaunchBlockerLedgerItem[] = getPlaceholderHonestyRows()
    .filter((item) => item.status === "Blocked")
    .map((item) => ({
      title: item.label,
      owner: "Shared",
      source: "Placeholder honesty",
      href: item.href,
      detail: `${item.note} Current: ${item.currentState}. Expected: ${item.expectedState}.`,
    }));

  const chartItems: LaunchBlockerLedgerItem[] = getChartVerificationRows()
    .filter((item) => item.status === "Blocked")
    .map((item) => ({
      title: item.label,
      owner: "Shared",
      source: "Chart verification",
      href: item.href,
      detail: `${item.note} Current: ${item.currentState}. Next: ${item.nextStep}.`,
    }));

  const items = [...controlItems, ...commitmentItems, ...decisionItems, ...approvalItems, ...qaItems, ...placeholderItems, ...chartItems];

  return {
    items,
    total: items.length,
    userOwned: items.filter((item) => item.owner === "User").length,
    sharedOwned: items.filter((item) => item.owner === "Shared").length,
  };
}
