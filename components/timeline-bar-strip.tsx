type TimelinePoint = {
  label: string;
  value: number;
};

type TimelineBarStripProps = {
  title: string;
  points: TimelinePoint[];
  positiveLabel?: string;
  negativeLabel?: string;
};

function normalize(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 50;
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

export function TimelineBarStrip({
  title,
  points,
  positiveLabel = "Positive breadth",
  negativeLabel = "Negative breadth",
}: TimelineBarStripProps) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-white">{title}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-mist/68">
          Timeline points will appear here once the last-session breadth feed is available.
        </div>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-white">{title}</p>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-mist/52">
          <span>{negativeLabel}</span>
          <span className="text-mist/30">•</span>
          <span>{positiveLabel}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {points.map((point) => {
          const offset = normalize(point.value, min, max);
          const height = Math.max(28, Math.abs(point.value) * 72 + 24);
          const positive = point.value >= 0;

          return (
            <div key={point.label} className="flex flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-2">
                <div
                  className={`w-full rounded-full ${
                    positive ? "bg-gradient-to-t from-sky to-aurora" : "bg-gradient-to-t from-bloom to-flare"
                  }`}
                  style={{
                    height: `${height}px`,
                    opacity: 0.7 + offset / 300,
                    boxShadow: positive
                      ? "0 0 26px rgba(126, 244, 212, 0.18)"
                      : "0 0 26px rgba(255, 112, 112, 0.15)",
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-mist/50">{point.label}</p>
                <p className="mt-1 text-xs font-medium text-white">{point.value.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
