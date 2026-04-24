type ComparisonVisualMetric = {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftScore: number;
  rightScore: number;
  note?: string;
};

type ComparisonVisualGridProps = {
  title: string;
  subtitle?: string;
  metrics: ComparisonVisualMetric[];
  leftName: string;
  rightName: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(6, Math.min(100, value));
}

export function ComparisonVisualGrid({
  title,
  subtitle,
  metrics,
  leftName,
  rightName,
}: ComparisonVisualGridProps) {
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
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[#1B3A6B]">{metric.label}</p>
              {metric.note ? <p className="text-xs text-[rgba(107,114,128,0.72)]">{metric.note}</p> : null}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[rgba(107,114,128,0.78)]">{leftName}</span>
                  <span className="font-semibold text-[#1B3A6B]">{metric.leftLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(27,58,107,0.08)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky to-aurora"
                    style={{ width: `${clampPercent(metric.leftScore)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[rgba(107,114,128,0.78)]">{rightName}</span>
                  <span className="font-semibold text-[#1B3A6B]">{metric.rightLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(27,58,107,0.08)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-flare to-bloom"
                    style={{ width: `${clampPercent(metric.rightScore)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
