import Link from "next/link";

import { GlowCard } from "@/components/ui";
import type { CompareRouteCandidate } from "@/lib/asset-insights";

type CompareHandoffHeroCardProps = {
  title: string;
  description: string;
  baseName: string;
  candidate: CompareRouteCandidate | null;
  primaryDetailHref: string;
  primaryDetailLabel: string;
};

export function CompareHandoffHeroCard({
  title,
  description,
  baseName,
  candidate,
  primaryDetailHref,
  primaryDetailLabel,
}: CompareHandoffHeroCardProps) {
  if (!candidate) {
    return null;
  }

  return (
    <GlowCard className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.18em] text-mist/56">Best compare handoff</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-aurora">
            {candidate.highlight}
          </div>
          {candidate.confidenceLabel ? (
            <div className="rounded-full border border-sky/20 bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-sky-100">
              {candidate.confidenceLabel}
            </div>
          ) : null}
          {candidate.truthLabel ? (
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-mist/70">
              {candidate.truthLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-mist/56">{candidate.matchupLabel ?? "Peer route"}</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {baseName} vs {candidate.targetName}
              </p>
              <p className="mt-2 text-sm text-mist/66">{candidate.subLabel}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-mist/76">{candidate.rationale}</p>
          {candidate.truthDetail ? <p className="mt-4 text-xs leading-6 text-mist/58">{candidate.truthDetail}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={candidate.href}
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Compare {baseName} vs {candidate.targetName}
            </Link>
            <Link
              href={candidate.targetHref}
              className="inline-flex rounded-full px-5 py-3 text-sm text-mist/74 transition hover:text-white"
            >
              Open {candidate.targetName} detail
            </Link>
            <Link
              href={primaryDetailHref}
              className="inline-flex rounded-full px-5 py-3 text-sm text-mist/60 transition hover:text-mist/78"
            >
              {primaryDetailLabel}
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {candidate.decisionLanes?.length ? (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm uppercase tracking-[0.16em] text-mist/56">Decision read</p>
              <div className="mt-4 grid gap-3">
                {candidate.decisionLanes.slice(0, 3).map((lane) => (
                  <p key={`${candidate.href}-${lane}`} className="text-sm leading-7 text-mist/74">
                    {lane}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {candidate.metrics?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {candidate.metrics.slice(2, 6).map((metric) => (
                <div key={`${candidate.href}-${metric.label}`} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-mist/58">{metric.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </GlowCard>
  );
}
