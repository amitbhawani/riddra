import { GlowCard } from "@/components/ui";
import type { IndexSnapshot } from "@/lib/index-intelligence";

function formatContribution(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export function IndexPullersDraggers({ snapshot }: { snapshot: IndexSnapshot }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <GlowCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-white">Top pullers</h2>
          <span className="rounded-full bg-aurora/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-aurora">
            Bullish weight
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {snapshot.topPullers.map((component) => (
            <div
              key={component.symbol}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-white">{component.name}</div>
                <div className="mt-1 text-xs text-mist/68">
                  {component.symbol} · {component.weight}% weight
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-aurora">
                  {formatContribution(component.contribution)}
                </div>
                <div className="mt-1 text-xs text-mist/68">{component.changePercent}% move</div>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      <GlowCard>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-white">Top draggers</h2>
          <span className="rounded-full bg-bloom/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-bloom">
            Bearish weight
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {snapshot.topDraggers.length > 0 ? (
            snapshot.topDraggers.map((component) => (
              <div
                key={component.symbol}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-white">{component.name}</div>
                  <div className="mt-1 text-xs text-mist/68">
                    {component.symbol} · {component.weight}% weight
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-bloom">
                    {formatContribution(component.contribution)}
                  </div>
                  <div className="mt-1 text-xs text-mist/68">{component.changePercent}% move</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm leading-7 text-mist/70">
              No meaningful draggers are visible in this snapshot.
            </div>
          )}
        </div>
      </GlowCard>
    </div>
  );
}
