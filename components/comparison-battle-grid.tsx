export type ComparisonBattleMetric = {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftScore: number;
  rightScore: number;
  winner: "left" | "right" | "tie" | "none";
  note: string;
};

type ComparisonBattleGridProps = {
  title: string;
  subtitle?: string;
  metrics: ComparisonBattleMetric[];
  leftName: string;
  rightName: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 10;
  }

  return Math.max(10, Math.min(100, value));
}

function winnerLabel(metric: ComparisonBattleMetric, leftName: string, rightName: string) {
  if (metric.winner === "left") return `${leftName} leads`;
  if (metric.winner === "right") return `${rightName} leads`;
  if (metric.winner === "tie") return "Even read";
  return "Needs richer feed";
}

export function ComparisonBattleGrid({
  title,
  subtitle,
  metrics,
  leftName,
  rightName,
}: ComparisonBattleGridProps) {
  return (
    <div className="riddra-product-card riddra-product-body rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(247,244,240,0.94)_100%)] p-6 shadow-[0_10px_28px_rgba(27,58,107,0.045)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1B3A6B]">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(75,85,99,0.84)]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
          <span>{leftName}</span>
          <span className="text-[rgba(107,114,128,0.4)]">vs</span>
          <span>{rightName}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(27,58,107,0.03)]"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-[#1B3A6B]">{metric.label}</p>
              <div className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                {winnerLabel(metric, leftName, rightName)}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="space-y-2 text-left lg:text-right">
                <div className="flex items-center justify-between gap-3 lg:flex-row-reverse">
                  <span className="text-xs uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">{leftName}</span>
                  <span className="text-sm font-semibold text-[#1B3A6B]">{metric.leftLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(27,58,107,0.08)]">
                  <div
                    className="ml-0 h-full rounded-full bg-gradient-to-r from-sky to-aurora lg:ml-auto"
                    style={{ width: `${clampPercent(metric.leftScore)}%` }}
                  />
                </div>
              </div>

              <div className="text-center text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.52)]">vs</div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">{rightName}</span>
                  <span className="text-sm font-semibold text-[#1B3A6B]">{metric.rightLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(27,58,107,0.08)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-flare to-bloom"
                    style={{ width: `${clampPercent(metric.rightScore)}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-6 text-[rgba(75,85,99,0.8)]">{metric.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
