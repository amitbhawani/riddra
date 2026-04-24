import { GlowCard } from "@/components/ui";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import type { SourceRegistryItem } from "@/lib/source-registry";

export function IndexOfficialSyncCard({
  snapshot,
  source,
}: {
  snapshot: IndexSnapshot;
  source: SourceRegistryItem | null;
}) {
  return (
    <GlowCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Official component sync</h2>
          <p className="max-w-3xl text-sm leading-7 text-mist/74">
            {snapshot.officialSyncNote}
          </p>
        </div>
        <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/82">
          {source?.officialStatus ?? "Source pending"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Reference source: <span className="text-white">{source?.sourceName ?? "To be assigned"}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Review cadence: <span className="text-white">{source?.refreshCadence ?? "Daily review required"}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Current display mode:{" "}
          <span className="text-white">
            {snapshot.dataMode === "verified"
              ? "Verified delayed snapshot"
              : snapshot.dataMode === "manual"
                ? "Manual source-backed roster"
                : "Reference seeded layer"}
          </span>
        </div>
      </div>
    </GlowCard>
  );
}
