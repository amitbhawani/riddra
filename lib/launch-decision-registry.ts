import { getActivationSequence } from "@/lib/activation-sequence";
import { getLaunchApprovals } from "@/lib/launch-approvals";
import { getLaunchDecision } from "@/lib/launch-decision";
import { getLaunchScorecard } from "@/lib/launch-scorecard";
import { getLiveSmokeTests } from "@/lib/live-smoke-tests";

export type LaunchDecisionRegistryStatus =
  | "Approved"
  | "Pending"
  | "Resolved"
  | "Blocking"
  | "Ready"
  | "Partial"
  | "Blocked"
  | "Ready to test"
  | "Ready to run"
  | "Optional";

export type LaunchDecisionRegistryRow = {
  lane: "Approval" | "Decision blocker" | "Scorecard" | "Activation step" | "Smoke test";
  label: string;
  status: LaunchDecisionRegistryStatus;
  href: string;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getLaunchDecisionRegistryRows(): LaunchDecisionRegistryRow[] {
  const approvals = getLaunchApprovals();
  const decision = getLaunchDecision();
  const scorecard = getLaunchScorecard();
  const activation = getActivationSequence();
  const smoke = getLiveSmokeTests();

  const approvalRows: LaunchDecisionRegistryRow[] = approvals.approvals.map((item) => ({
    lane: "Approval",
    label: `${item.owner}: ${item.lane}`,
    status: item.status,
    href: "/admin/launch-approvals",
    note: item.detail,
    source: "Launch approvals board",
  }));

  const blockerRows: LaunchDecisionRegistryRow[] = decision.blockers.map((item) => ({
    lane: "Decision blocker",
    label: item.title,
    status: item.status,
    href: "/admin/go-no-go",
    note: item.detail,
    source: `Required for ${item.requiredFor}`,
  }));

  const scoreRows: LaunchDecisionRegistryRow[] = scorecard.items.map((item) => ({
    lane: "Scorecard",
    label: item.title,
    status: item.status,
    href: "/admin/go-no-go",
    note: item.detail,
    source: "Launch scorecard",
  }));

  const activationRows: LaunchDecisionRegistryRow[] = activation.steps.map((item) => ({
    lane: "Activation step",
    label: item.step,
    status: item.status,
    href: item.href,
    note: item.detail,
    source: `${item.owner} activation sequence`,
  }));

  const smokeRows: LaunchDecisionRegistryRow[] = smoke.tests.map((item) => ({
    lane: "Smoke test",
    label: item.title,
    status: item.status,
    href: item.path,
    note: item.summary,
    source: "Live smoke tests",
  }));

  return [...approvalRows, ...blockerRows, ...scoreRows, ...activationRows, ...smokeRows];
}

export function getLaunchDecisionRegistrySummary() {
  const rows = getLaunchDecisionRegistryRows();

  return {
    total: rows.length,
    approved: rows.filter((row) => row.status === "Approved").length,
    pending: rows.filter((row) => row.status === "Pending").length,
    blocking: rows.filter((row) => row.status === "Blocking" || row.status === "Blocked").length,
    inProgress: rows.filter((row) => row.status === "Partial" || row.status === "Ready to run").length,
  };
}

export function toLaunchDecisionRegistryCsv(rows: LaunchDecisionRegistryRow[]) {
  const header = ["lane", "label", "status", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.label, row.status, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
