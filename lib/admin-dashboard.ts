import type { CoverageAudit } from "@/lib/content-audit";
import type { EditorialGuidance } from "@/lib/editorial";

export type AssetPipelineItem = {
  assetType: "stock" | "ipo" | "mutual_fund";
  slug: string;
  name: string;
  score: number;
  status: EditorialGuidance["status"];
  priority: EditorialGuidance["priority"];
  nextAction: string;
  missingLive: string[];
};

export type DashboardSummary = {
  totalAssets: number;
  p0Count: number;
  readyForDepthCount: number;
  avgScore: number;
};

export function buildPipelineItem({
  assetType,
  slug,
  name,
  audit,
  guidance,
}: {
  assetType: AssetPipelineItem["assetType"];
  slug: string;
  name: string;
  audit: CoverageAudit;
  guidance: EditorialGuidance;
}): AssetPipelineItem {
  return {
    assetType,
    slug,
    name,
    score: audit.score,
    status: guidance.status,
    priority: guidance.priority,
    nextAction: guidance.nextAction,
    missingLive: audit.missingLive,
  };
}

export function sortPipeline(items: AssetPipelineItem[]) {
  const priorityRank = { P0: 0, P1: 1, P2: 2 };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    if (a.score !== b.score) return a.score - b.score;
    return a.name.localeCompare(b.name);
  });
}

export function summarizePipeline(items: AssetPipelineItem[]): DashboardSummary {
  return {
    totalAssets: items.length,
    p0Count: items.filter((item) => item.priority === "P0").length,
    readyForDepthCount: items.filter((item) => item.status === "ready_for_depth").length,
    avgScore: items.length
      ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
      : 0,
  };
}
