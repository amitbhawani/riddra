import { GlowCard } from "@/components/ui";
import type { EditorialGuidance } from "@/lib/editorial";
import { getStatusLabel } from "@/lib/editorial";

export function EditorialGuidanceCard({
  guidance,
}: {
  guidance: EditorialGuidance;
}) {
  return (
    <GlowCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Editorial readiness</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            This is the current publishing posture for this page based on the Riddra blueprint.
          </p>
        </div>
        <div className="rounded-full bg-flare/10 px-4 py-2 text-sm font-semibold text-flare">
          {guidance.priority}
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Status: <span className="text-white">{getStatusLabel(guidance.status)}</span>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
          Next action: <span className="text-white">{guidance.nextAction}</span>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
        {guidance.operatorNote}
      </div>
    </GlowCard>
  );
}
