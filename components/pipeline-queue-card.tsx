import { GlowCard } from "@/components/ui";
import type { AssetPipelineItem } from "@/lib/admin-dashboard";
import { getStatusLabel } from "@/lib/editorial";

export function PipelineQueueCard({
  title,
  items,
}: {
  title: string;
  items: AssetPipelineItem[];
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={`${item.assetType}:${item.slug}`} className="rounded-[24px] border border-white/8 bg-black/15 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <p className="mt-2 text-sm text-mist/68">
                    {item.assetType} • {item.slug}
                  </p>
                </div>
                <div className="rounded-full bg-flare/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-flare">
                  {item.priority}
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/78">
                  Score: <span className="text-white">{item.score}%</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/78">
                  Status: <span className="text-white">{getStatusLabel(item.status)}</span>
                </div>
              </div>
              <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
                <p>
                  <span className="text-white">Next action:</span> {item.nextAction}
                </p>
                {item.missingLive.length > 0 ? (
                  <p className="mt-3">
                    <span className="text-white">Missing live-standard blocks:</span> {item.missingLive.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-7 text-mist/72">No pipeline items in this queue right now.</p>
        )}
      </div>
    </GlowCard>
  );
}
