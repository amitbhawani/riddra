import type { ContentSection } from "@/lib/content-sections";
import type { SourceRegistryItem } from "@/lib/source-registry";
import { getBlueprint, type AssetType } from "@/lib/page-blueprints";

export type CoverageAudit = {
  assetType: AssetType;
  liveCount: number;
  plannedCount: number;
  completedLiveCount: number;
  score: number;
  missingLive: string[];
};

export function auditCoverage({
  assetType,
  hasSummary,
  hasSnapshot,
  hasMetrics,
  sections,
  source,
}: {
  assetType: AssetType;
  hasSummary: boolean;
  hasSnapshot: boolean;
  hasMetrics?: boolean;
  sections: ContentSection[];
  source: SourceRegistryItem | null;
}): CoverageAudit {
  const blueprint = getBlueprint(assetType);
  const liveBlocks = blueprint.filter((item) => item.status === "live");
  const completed = new Set<string>();

  if (hasSummary) completed.add("hero_summary");
  if (hasSnapshot) {
    if (assetType === "stock") completed.add("price_snapshot");
    if (assetType === "ipo") completed.add("timeline_snapshot");
    if (assetType === "mutual_fund") completed.add("nav_snapshot");
  }
  if (hasMetrics && assetType === "stock") completed.add("core_metrics");
  if (sections.length > 0) completed.add("content_sections");
  if (source) completed.add("source_trust");

  const missingLive = liveBlocks
    .filter((item) => !completed.has(item.key))
    .map((item) => item.label);

  const score = Math.round((completed.size / liveBlocks.length) * 100);

  return {
    assetType,
    liveCount: liveBlocks.length,
    plannedCount: blueprint.filter((item) => item.status === "planned").length,
    completedLiveCount: completed.size,
    score,
    missingLive,
  };
}
