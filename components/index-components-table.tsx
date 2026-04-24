import Link from "next/link";

import { GlowCard } from "@/components/ui";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import { sampleStocks } from "@/lib/mock-data";

const stockSlugBySymbol = new Map(sampleStocks.map((stock) => [stock.symbol, stock.slug]));

export function IndexComponentsTable({ snapshot }: { snapshot: IndexSnapshot }) {
  const bullishComponents = snapshot.components
    .filter((component) => component.signal === "bullish" || component.changePercent > 0)
    .sort((left, right) => right.weight - left.weight);
  const bearishComponents = snapshot.components
    .filter((component) => component.signal === "bearish" || component.changePercent < 0)
    .sort((left, right) => right.weight - left.weight);
  const neutralComponents = snapshot.components
    .filter((component) => component.signal === "neutral" && component.changePercent === 0)
    .sort((left, right) => right.weight - left.weight);

  return (
    <GlowCard>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Index components by stance</h2>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Show the full visible constituent roster with bullish components on the left and bearish components on the right so the leadership split and weight distribution stay obvious at a glance.
          </p>
        </div>
        <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/82">
          {snapshot.dataMode === "verified"
            ? "Verified roster"
            : snapshot.dataMode === "manual"
              ? "Manual source roster"
              : "Roster view"}
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <ComponentTable
          title="Bullish components"
          tone="bullish"
          emptyLabel="No bullish components are visible in this snapshot."
          components={bullishComponents}
        />
        <ComponentTable
          title="Bearish components"
          tone="bearish"
          emptyLabel="No bearish components are visible in this snapshot."
          components={bearishComponents}
        />
      </div>

      {neutralComponents.length > 0 ? (
        <div className="mt-6 rounded-[24px] border border-white/8 bg-black/15 p-5">
          <h3 className="text-base font-semibold text-white">Neutral components</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {neutralComponents.map((component) => (
              <div key={component.symbol} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-mist/78">
                {component.symbol} · {component.weight}%
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </GlowCard>
  );
}

function ComponentTable({
  title,
  tone,
  emptyLabel,
  components,
}: {
  title: string;
  tone: "bullish" | "bearish";
  emptyLabel: string;
  components: IndexSnapshot["components"];
}) {
  const toneClass = tone === "bullish" ? "text-aurora" : "text-bloom";
  const badgeClass = tone === "bullish" ? "bg-aurora/12 text-aurora" : "bg-bloom/12 text-bloom";

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.04] px-4 py-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${badgeClass}`}>
          {components.length}
        </span>
      </div>
      {components.length > 0 ? (
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-black/15 text-mist/70">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Move</th>
              <th className="px-4 py-3 font-medium">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={`${title}-${component.symbol}`} className="border-t border-white/8">
                <td className="px-4 py-3 text-mist/80">
                  {stockSlugBySymbol.get(component.symbol) ? (
                    <Link
                      href={`/stocks/${stockSlugBySymbol.get(component.symbol)}`}
                      className="block rounded-xl transition hover:bg-white/[0.03]"
                    >
                      <div className="font-medium text-white transition hover:text-aurora">{component.symbol}</div>
                      <div className="mt-1 text-xs text-mist/60">{component.name}</div>
                    </Link>
                  ) : (
                    <>
                      <div className="font-medium text-white">{component.symbol}</div>
                      <div className="mt-1 text-xs text-mist/60">{component.name}</div>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-mist/80">{component.weight}%</td>
                <td className={`px-4 py-3 ${toneClass}`}>{component.changePercent}%</td>
                <td className={`px-4 py-3 ${toneClass}`}>{component.contribution > 0 ? "+" : ""}{component.contribution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-4 py-5 text-sm leading-7 text-mist/70">{emptyLabel}</div>
      )}
    </div>
  );
}
