import { GlowCard } from "@/components/ui";
import type { IndexSnapshot } from "@/lib/index-intelligence";

function toneClass(mood: IndexSnapshot["marketMood"]) {
  if (mood === "Bullish") return "text-aurora";
  if (mood === "Bearish") return "text-bloom";
  return "text-flare";
}

export function IndexTimelineCard({ snapshot }: { snapshot: IndexSnapshot }) {
  return (
    <GlowCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Last session breadth rhythm</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            Use this temporary last-trading-session snapshot to see how breadth evolved across the day instead of only reading the latest index print.
          </p>
        </div>
        <div className="rounded-full bg-white/[0.04] px-4 py-2 text-sm text-white">
          {snapshot.sessionPhase}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {snapshot.timeline.map((point) => (
          <div
            key={point.timeLabel}
            className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-mist/58">{point.timeLabel}</div>
            <div className={`mt-3 text-lg font-semibold ${toneClass(point.marketMood)}`}>
              {point.marketMood}
            </div>
            <div className="mt-3 text-sm text-mist/76">
              Breadth: <span className="text-white">{point.weightedBreadthScore}</span>
            </div>
            <div className="mt-1 text-sm text-mist/76">
              Move: <span className="text-white">{point.movePercent}%</span>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
