import { GlowCard } from "@/components/ui";
import type { MarketStat } from "@/lib/market-overview";

export function MarketStatGrid({ stats }: { stats: MarketStat[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <GlowCard key={stat.label}>
          <p className="text-sm text-mist/66">{stat.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
          <p className="mt-2 text-sm leading-6 text-mist/72">{stat.note}</p>
        </GlowCard>
      ))}
    </div>
  );
}
