import type { CoverageAudit } from "@/lib/content-audit";
import type { AssetType } from "@/lib/page-blueprints";

export type EditorialStatus = "foundation" | "growing" | "ready_for_depth";

export type EditorialGuidance = {
  assetType: AssetType;
  status: EditorialStatus;
  priority: "P0" | "P1" | "P2";
  nextAction: string;
  operatorNote: string;
};

export function getEditorialGuidance(audit: CoverageAudit): EditorialGuidance {
  if (audit.score >= 100) {
    return {
      assetType: audit.assetType,
      status: "ready_for_depth",
      priority: "P1",
      nextAction: getDepthAction(audit.assetType),
      operatorNote:
        "The live-standard foundation is complete, so the next gains come from deeper comparative or event-driven content.",
    };
  }

  if (audit.score >= 60) {
    return {
      assetType: audit.assetType,
      status: "growing",
      priority: "P0",
      nextAction: getCoreCompletionAction(audit),
      operatorNote:
        "This page is useful already, but it still needs stronger live-standard blocks before it should be treated as a flagship template.",
    };
  }

  return {
    assetType: audit.assetType,
    status: "foundation",
    priority: "P0",
    nextAction: getFoundationAction(audit.assetType),
    operatorNote:
      "This page has basic structure but still needs foundational work before it becomes a strong traffic and trust asset.",
  };
}

function getFoundationAction(assetType: AssetType) {
  if (assetType === "stock") return "Complete structured stock sections and source trust for the core template.";
  if (assetType === "ipo") return "Complete lifecycle-oriented IPO sections and tighten issue source mapping.";
  return "Complete mutual-fund content sections and add stronger investor-facing context.";
}

function getCoreCompletionAction(audit: CoverageAudit) {
  return audit.missingLive.length > 0
    ? `Complete missing live-standard blocks: ${audit.missingLive.join(", ")}.`
    : "Tighten current blocks and improve editorial consistency.";
}

function getDepthAction(assetType: AssetType) {
  if (assetType === "stock") return "Add charts, fundamentals, peer comparison, and filings depth.";
  if (assetType === "ipo") return "Add subscription tracker, GMP, allotment, and listing-day intelligence.";
  return "Add return tables, holdings, risk, category context, and compare workflows.";
}

export function getStatusLabel(status: EditorialStatus) {
  if (status === "foundation") return "Foundation";
  if (status === "growing") return "Growing";
  return "Ready for Depth";
}
