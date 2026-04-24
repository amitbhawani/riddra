type AllocationItem = {
  name: string;
  weight: string;
  caption?: string;
};

type AllocationBarListProps = {
  items: AllocationItem[];
  title: string;
  subtitle?: string;
};

function toPercentValue(weight: string) {
  const parsed = Number.parseFloat(weight.replace("%", ""));
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(4, Math.min(parsed, 100));
}

export function AllocationBarList({ items, title, subtitle }: AllocationBarListProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm leading-7 text-mist/70">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={`${item.name}-${item.weight}`} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-white">{item.name}</p>
                {item.caption ? <p className="text-mist/60">{item.caption}</p> : null}
              </div>
              <span className="font-semibold text-white">{item.weight}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky to-aurora"
                style={{ width: `${toPercentValue(item.weight)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
