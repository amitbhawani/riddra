import { GlowCard } from "@/components/ui";
import { TradingviewEmbed } from "@/components/tradingview-embed";

type TradingviewChartCardProps = {
  title: string;
  description: string;
  symbol: string;
  height?: number;
  eyebrow?: string;
  allowSymbolChange?: boolean;
  hideTopToolbar?: boolean;
};

export function TradingviewChartCard({
  title,
  description,
  symbol,
  height = 440,
  eyebrow = "TradingView chart",
  allowSymbolChange = false,
  hideTopToolbar = false,
}: TradingviewChartCardProps) {
  return (
    <GlowCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/80">
          {symbol}
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8 bg-[#07111a]">
        <TradingviewEmbed
          symbol={symbol}
          height={height}
          allowSymbolChange={allowSymbolChange}
          hideTopToolbar={hideTopToolbar}
        />
      </div>
    </GlowCard>
  );
}
