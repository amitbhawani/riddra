import { GlowCard } from "@/components/ui";
import type { InsightCard } from "@/lib/asset-insights";

export function InsightCardGrid({
  title,
  cards,
}: {
  title: string;
  cards: InsightCard[];
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-white/8 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-mist/68">{card.label}</p>
              <p className="text-sm font-semibold text-white">{card.value}</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-mist/74">{card.takeaway}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
