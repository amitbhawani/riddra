import { GlowCard } from "@/components/ui";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import { MarketDataStatusBadge } from "@/components/market-data-status-badge";
import { TimelineBarStrip } from "@/components/timeline-bar-strip";

export function IndexMoodCard({ snapshot }: { snapshot: IndexSnapshot }) {
  const tone =
    snapshot.marketMood === "Bullish"
      ? "text-aurora"
      : snapshot.marketMood === "Bearish"
        ? "text-bloom"
        : "text-flare";

  return (
    <GlowCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Daily market mood</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            This is based on component weightage and contribution, not just the final index print.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
            {snapshot.dataMode === "verified"
              ? `Verified index snapshot · updated ${snapshot.lastUpdated}`
              : snapshot.dataMode === "manual"
                ? `Manual source entry · updated ${snapshot.lastUpdated}`
                : `Seeded index intelligence · ${snapshot.lastUpdated}`}
          </p>
          <p className="mt-3 text-sm font-medium text-white">{snapshot.marketLabel}</p>
          <p className="mt-2 text-sm leading-7 text-mist/68">{snapshot.marketDetail}</p>
        </div>
        <div className={`rounded-full bg-white/[0.04] px-4 py-2 text-sm font-semibold ${tone}`}>
          {snapshot.marketMood}
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Index move: <span className="text-white">{snapshot.movePercent}%</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Weighted breadth: <span className="text-white">{snapshot.weightedBreadthScore}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Breadth label: <span className="text-white">{snapshot.breadthLabel}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Advancers vs decliners:{" "}
          <span className="text-white">
            {snapshot.advancingCount}/{snapshot.decliningCount}
          </span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Positive weight share: <span className="text-white">{snapshot.positiveWeightShare}%</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Dominance read: <span className="text-white">{snapshot.dominanceLabel}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Intraday trend: <span className="text-white">{snapshot.trendLabel}</span>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
        {snapshot.narrative}
      </div>

      <div className="mt-5">
        <TimelineBarStrip
          title="Intraday breadth rhythm"
          points={snapshot.timeline.map((point) => ({
            label: point.timeLabel,
            value: point.weightedBreadthScore,
          }))}
        />
      </div>

      <div className="mt-5">
        <MarketDataStatusBadge
          title="Index verification"
          status={snapshot.marketLabel}
          detail={snapshot.marketDetail}
          source={snapshot.sourceCode}
          updated={snapshot.lastUpdated}
          tone={
            snapshot.dataMode === "verified"
              ? "verified"
              : snapshot.dataMode === "manual"
                ? "degraded"
                : "pending"
          }
        />
      </div>
    </GlowCard>
  );
}
