import { GlowCard } from "@/components/ui";
import type { CoverageAudit } from "@/lib/content-audit";
import { getBlueprint } from "@/lib/page-blueprints";

export function CoverageScoreCard({ audit }: { audit: CoverageAudit }) {
  const blueprint = getBlueprint(audit.assetType);

  return (
    <GlowCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Coverage score</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            This shows how close the page is to the standardized Riddra blueprint for this asset type.
          </p>
        </div>
        <div className="rounded-full bg-aurora/10 px-4 py-2 text-sm font-semibold text-aurora">
          {audit.score}%
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Live blocks completed: <span className="text-white">{audit.completedLiveCount}/{audit.liveCount}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Planned advanced blocks: <span className="text-white">{audit.plannedCount}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {blueprint.map((block) => (
          <div
            key={block.key}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
          >
            <span className="text-mist/78">{block.label}</span>
            <span className={block.status === "live" ? "text-aurora" : "text-flare"}>
              {block.status === "live" ? "Current standard" : "Next standard"}
            </span>
          </div>
        ))}
      </div>

      {audit.missingLive.length > 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
          Missing live-standard blocks: {audit.missingLive.join(", ")}
        </div>
      ) : null}
    </GlowCard>
  );
}
