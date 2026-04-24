import { GlowCard } from "@/components/ui";

export function DocumentListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; label: string }>;
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.title}`} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mist/58">{item.label}</p>
            </div>
            <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
              Planned
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
