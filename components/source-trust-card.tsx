import { GlowCard } from "@/components/ui";
import type { SourceRegistryItem } from "@/lib/source-registry";

export function SourceTrustCard({
  source,
  contextLabel,
}: {
  source: SourceRegistryItem | null;
  contextLabel: string;
}) {
  if (!source) {
    return (
      <GlowCard>
        <h2 className="text-2xl font-semibold text-white">Source trust</h2>
        <p className="mt-4 text-sm leading-7 text-mist/72">
          No source mapping has been assigned yet for this {contextLabel}. Connect an approved source before verified public data is shown here.
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Source trust</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            This {contextLabel} is currently tied to <span className="text-white">{source.sourceName}</span>.
          </p>
        </div>
        <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
          {source.officialStatus}
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Domain: <span className="text-white">{source.domain}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Refresh cadence: <span className="text-white">{source.refreshCadence || "To be finalized"}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Coverage: <span className="text-white">{source.coverageScope || "To be documented"}</span>
        </div>
      </div>
      <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
        <p>
          <span className="text-white">License note:</span> {source.licenseNote || "Source licensing review is still being finalized."}
        </p>
        <p className="mt-3">
          <span className="text-white">Fallback:</span> {source.fallbackBehavior || "Fallback display rules apply until verified source data is available."}
        </p>
      </div>
    </GlowCard>
  );
}
