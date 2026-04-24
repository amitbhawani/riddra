type SingleAssetVisualMetric = {
  label: string;
  value: string;
  score: number;
  note?: string;
};

type SingleAssetVisualGridProps = {
  title: string;
  subtitle?: string;
  metrics: SingleAssetVisualMetric[];
  accent?: "aurora" | "flare";
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 12;
  return Math.max(8, Math.min(100, value));
}

export function SingleAssetVisualGrid({
  title,
  subtitle,
  metrics,
  accent = "aurora",
}: SingleAssetVisualGridProps) {
  const gradientClass =
    accent === "flare" ? "from-flare to-bloom" : "from-sky to-aurora";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">{subtitle}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-white">{metric.label}</p>
              <p className="text-sm font-semibold text-white">{metric.value}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
                style={{ width: `${clampScore(metric.score)}%` }}
              />
            </div>
            {metric.note ? <p className="mt-3 text-xs leading-6 text-mist/60">{metric.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
