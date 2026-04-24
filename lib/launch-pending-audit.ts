import { backendPendingChecklist } from "@/lib/build-tracker";
import { getConversionPathRegistryRows } from "@/lib/conversion-path-audit";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getLaunchState } from "@/lib/launch-state";
import {
  getImmediateLaunchBlockers,
  getLaunchChecklist,
} from "@/lib/launch-readiness";
import { getLaunchRehearsalPacketRows } from "@/lib/launch-rehearsal-packet";
import { mobileJourneyItems } from "@/lib/mobile-journeys";
import { operatorControlGroups } from "@/lib/operator-controls";
import { getPaymentReadinessItems } from "@/lib/payment-readiness";
import { getPlaceholderHonestyRows } from "@/lib/placeholder-honesty-registry";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";
import { replayMemoryChains } from "@/lib/replay-memory";
import { sourceReadinessItems } from "@/lib/source-readiness";
import { getSubscriberLaunchReadinessItems } from "@/lib/subscriber-launch-readiness";
import { trafficHealthItems } from "@/lib/traffic-health";

export type LaunchPendingAuditStatus = "Blocked" | "In progress" | "Queued";

export type LaunchPendingAuditPerspective = "Viewer" | "Developer" | "Operator";

export type LaunchPendingAuditItem = {
  id: string;
  lane: string;
  perspective: LaunchPendingAuditPerspective;
  title: string;
  status: LaunchPendingAuditStatus;
  detail: string;
  href: string;
  source: string;
};

export type LaunchPendingAuditGroup = {
  lane: string;
  perspective: LaunchPendingAuditPerspective;
  items: LaunchPendingAuditItem[];
};

const MAX_PENDING_AUDIT_ITEMS = 100;

function isPrivateBetaActivationScope() {
  const mode = getLaunchState().mode;
  return mode === "internal_review" || mode === "launch_prep" || mode === "private_beta";
}

function privateBetaRelevantBackendTitles() {
  return new Set([
    "Automated official-source refresh and archival writes",
    "Durable chart and market-history persistence",
    "Durable workspace memory across watchlists, alerts, screens, inbox, and consent state",
    "Portfolio import audit trail and reconciliation persistence",
    "Broker adapter and sync pipeline",
  ]);
}

function privateBetaRelevantPlaceholderHrefs() {
  return new Set([
    "/portfolio",
    "/option-chain",
  ]);
}

function privateBetaRelevantChecklistTitles() {
  return new Set([
    "Homepage, stock, IPO, fund, chart, and index routes",
    "Auth foundation and subscriber workspace",
    "Official source and data refresh setup",
    "Communication and support setup",
  ]);
}

function privateBetaRelevantSubscriberTitles() {
  return new Set([
    "Real auth and subscriber identity",
    "Portfolio, watchlists, alerts, and broker continuity",
  ]);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function item(
  lane: string,
  perspective: LaunchPendingAuditPerspective,
  title: string,
  status: LaunchPendingAuditStatus,
  detail: string,
  href: string,
  source: string,
): LaunchPendingAuditItem {
  return {
    id: `${slugify(lane)}-${slugify(title)}`,
    lane,
    perspective,
    title,
    status,
    detail,
    href,
    source,
  };
}

function toAuditStatus(status: string): LaunchPendingAuditStatus | null {
  const normalized = status.trim().toLowerCase();

  if (
    normalized === "ready" ||
    normalized === "complete" ||
    normalized === "live"
  ) {
    return null;
  }

  if (
    normalized.includes("blocked") ||
    normalized.includes("needs activation") ||
    normalized.includes("needs config")
  ) {
    return "Blocked";
  }

  if (
    normalized.includes("queued") ||
    normalized.includes("deferred") ||
    normalized.includes("planned") ||
    normalized.includes("later")
  ) {
    return "Queued";
  }

  return "In progress";
}

function getOrderedAuditItems() {
  const auditItems: LaunchPendingAuditItem[] = [];
  const privateBetaScope = isPrivateBetaActivationScope();

  auditItems.push(
    ...getImmediateLaunchBlockers()
      .filter((row) => row.status !== "Ready")
      .map((row) =>
      item(
        "Cutover blockers",
        "Operator",
        row.title,
        row.status === "Needs activation" ? "Blocked" : "In progress",
        row.note,
        row.href,
        "Launch readiness",
      ),
    ),
  );

  auditItems.push(
    ...getLaunchChecklist()
      .filter((row) => row.status !== "Ready")
      .filter((row) =>
        privateBetaScope
          ? privateBetaRelevantChecklistTitles().has(row.title)
          : true,
      )
      .map((row) =>
        item(
          "Go-live checklist",
          "Viewer",
          row.title,
          row.status === "Pending" ? "Blocked" : "In progress",
          row.note,
          "/launch-readiness",
          "Launch readiness",
        ),
      ),
  );

  if (!privateBetaScope) {
    auditItems.push(
      ...getLaunchCommitmentItems()
        .filter((row) => row.status !== "Ready" && row.status !== "Deferred")
        .map((row) =>
          item(
            "Launch commitments",
            "Operator",
            row.title,
            row.status === "Blocked" ? "Blocked" : "In progress",
            row.detail,
            row.href,
            "Launch commitments",
          ),
        ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...getPublicLaunchQaItems()
        .filter((row) => row.status !== "Ready")
        .map((row) =>
          item(
            "Public QA",
            "Viewer",
            row.title,
            row.status === "Blocked" ? "Blocked" : "In progress",
            row.note,
            row.href,
            "Public launch QA",
          ),
        ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...getLaunchRehearsalPacketRows().map((row) =>
        item(
          "Launch rehearsal",
          "Operator",
          `${row.lane}: ${row.label}`,
          row.status === "Needs config" ? "Blocked" : "In progress",
          row.detail,
          row.href,
          "Launch rehearsal packet",
        ),
      ),
    );
  }

  auditItems.push(
    ...getSubscriberLaunchReadinessItems()
      .filter((row) => row.status !== "Ready")
      .filter((row) =>
        privateBetaScope
          ? privateBetaRelevantSubscriberTitles().has(row.title)
          : true
      )
      .map((row) =>
        item(
          "Subscriber truth",
          "Viewer",
          row.title,
          row.status === "Blocked" ? "Blocked" : "In progress",
          row.note,
          row.href,
          "Subscriber launch readiness",
        ),
      ),
  );

  if (!privateBetaScope) {
    auditItems.push(
      ...getPaymentReadinessItems().map((row) =>
        item(
          "Billing and payments",
          "Viewer",
          row.title,
          row.status === "Blocked" ? "Blocked" : row.status === "Deferred" ? "Queued" : "In progress",
          row.note,
          "/admin/payment-readiness",
          "Payment readiness",
        ),
      ),
    );
  }

  auditItems.push(
    ...getPlaceholderHonestyRows()
      .filter((row) => row.status !== "Ready")
      .filter((row) =>
        privateBetaScope ? privateBetaRelevantPlaceholderHrefs().has(row.href) : true,
      )
      .map((row) =>
        item(
          "Placeholder honesty",
          "Viewer",
          row.label,
          row.status === "Blocked" ? "Blocked" : "In progress",
          row.note,
          row.href,
          "Placeholder honesty registry",
        ),
      ),
  );

  auditItems.push(
    ...backendPendingChecklist.flatMap((group) =>
      group.items
        .filter((row) => row.status !== "Complete")
        .filter((row) =>
          privateBetaScope
            ? privateBetaRelevantBackendTitles().has(row.title)
            : true,
        )
        .map((row) =>
          item(
            group.title,
            "Developer",
            row.title,
            row.status === "Planned" ? "Queued" : "In progress",
            row.summary,
            row.href ?? "/build-tracker",
            "Backend still pending",
          ),
        ),
    ),
  );

  if (!privateBetaScope) {
    auditItems.push(
      ...sourceReadinessItems.map((row) =>
        item(
          "Source activation",
          "Operator",
          row.name,
          row.priority === "Start now" ? "In progress" : "Queued",
          `${row.purpose} ${row.whyItMatters}`,
          "/source-readiness",
          "Source readiness",
        ),
      ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...getConversionPathRegistryRows()
        .filter((row) => row.status !== "Ready")
        .map((row) =>
          item(
            "Conversion path",
            "Viewer",
            row.label,
            row.status === "Blocked" ? "Blocked" : "In progress",
            row.detail,
            row.href,
            "Conversion path audit",
          ),
        ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...mobileJourneyItems.map((row) =>
        item(
          "Mobile continuity",
          "Viewer",
          row.title,
          row.status === "Queued" ? "Queued" : "In progress",
          row.summary,
          "/admin/mobile-journeys",
          "Mobile journeys",
        ),
      ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...trafficHealthItems.map((row) =>
        item(
          "Traffic health",
          "Developer",
          row.title,
          row.status === "Queued" ? "Queued" : "In progress",
          row.summary,
          "/admin/traffic-health",
          "Traffic health",
        ),
      ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...operatorControlGroups
        .filter((row) => row.status !== "Live")
        .map((row) =>
          item(
            "Operator controls",
            "Operator",
            row.title,
            row.status === "Queued" ? "Queued" : "In progress",
            row.summary,
            "/admin/operator-controls",
            "Operator controls",
          ),
        ),
    );
  }

  if (!privateBetaScope) {
    auditItems.push(
      ...replayMemoryChains.map((row) =>
        item(
          "Replay and continuity",
          "Viewer",
          row.title,
          row.status === "Planned" ? "Queued" : "In progress",
          row.continuity,
          "/admin/replay-memory",
          "Replay memory",
        ),
      ),
    );
  }

  return auditItems.slice(0, MAX_PENDING_AUDIT_ITEMS);
}

export function getLaunchPendingAuditItems() {
  return getOrderedAuditItems();
}

export function getLaunchPendingAuditGroups(): LaunchPendingAuditGroup[] {
  const groups = new Map<string, LaunchPendingAuditGroup>();

  for (const auditItem of getOrderedAuditItems()) {
    const key = `${auditItem.perspective}:${auditItem.lane}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(auditItem);
      continue;
    }

    groups.set(key, {
      lane: auditItem.lane,
      perspective: auditItem.perspective,
      items: [auditItem],
    });
  }

  return [...groups.values()];
}

export function getLaunchPendingAuditSummary() {
  const items = getOrderedAuditItems();

  return {
    total: items.length,
    blocked: items.filter((row) => row.status === "Blocked").length,
    inProgress: items.filter((row) => row.status === "In progress").length,
    queued: items.filter((row) => row.status === "Queued").length,
    viewer: items.filter((row) => row.perspective === "Viewer").length,
    developer: items.filter((row) => row.perspective === "Developer").length,
    operator: items.filter((row) => row.perspective === "Operator").length,
  };
}
