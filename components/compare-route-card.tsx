import Link from "next/link";

import { GlowCard } from "@/components/ui";
import type { CompareRouteCandidate } from "@/lib/asset-insights";

function cleanCompareRouteText(value: string | null | undefined, fallback = "Not available yet") {
  const normalized = String(value ?? "").trim();
  const pendingCopyPattern = new RegExp(`${["Awaiting", "verified"].join("\\s+")}[^•.,"\\n]*`, "gi");
  const pendingPrefixPattern = new RegExp(`^${["awaiting", "verified"].join("\\s+")}`, "i");

  if (!normalized || pendingPrefixPattern.test(normalized)) {
    return fallback;
  }

  return normalized.replace(pendingCopyPattern, fallback);
}

export function CompareRouteCard({
  title,
  description,
  baseName,
  detailHref,
  detailLabel,
  candidates,
}: {
  title: string;
  description: string;
  baseName: string;
  detailHref: string;
  detailLabel: string;
  candidates: CompareRouteCandidate[];
}) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <GlowCard className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">{description}</p>
        </div>
        <Link href={detailHref} className="text-sm text-aurora transition hover:text-white">
          {detailLabel}
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {candidates.map((candidate) => (
          <div key={candidate.href} className="rounded-[24px] border border-white/8 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">{candidate.targetName}</p>
                <p className="mt-2 text-sm text-mist/68">{cleanCompareRouteText(candidate.subLabel)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs text-aurora">
                  {cleanCompareRouteText(candidate.highlight)}
                </div>
                {candidate.confidenceLabel ? (
                  <div className="rounded-full border border-sky/20 bg-sky/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-sky-100">
                    {cleanCompareRouteText(candidate.confidenceLabel)}
                  </div>
                ) : null}
                {candidate.truthLabel ? (
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-mist/70">
                    {cleanCompareRouteText(candidate.truthLabel)}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-mist/74">
              {cleanCompareRouteText(candidate.rationale)}
            </p>
            {candidate.matchupLabel ? (
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/56">{cleanCompareRouteText(candidate.matchupLabel)}</p>
            ) : null}
            {candidate.metrics?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {candidate.metrics.map((metric) => (
                  <div key={`${candidate.href}-${metric.label}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-mist/58">{metric.label}</p>
                    <p className="mt-2 text-sm font-medium text-white">{cleanCompareRouteText(metric.value)}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {candidate.decisionLanes?.length ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-mist/58">Decision read</p>
                <div className="mt-3 grid gap-2">
                  {candidate.decisionLanes.map((lane) => (
                    <p key={`${candidate.href}-${lane}`} className="text-xs leading-6 text-mist/70">
                      {cleanCompareRouteText(lane)}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
            {candidate.truthDetail ? (
              <p className="mt-4 text-xs leading-6 text-mist/58">{cleanCompareRouteText(candidate.truthDetail)}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={candidate.href}
                className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Compare {baseName} vs {candidate.targetName}
              </Link>
              <Link href={candidate.targetHref} className="rounded-full px-4 py-2 text-sm text-mist/74 transition hover:text-white">
                Open {candidate.targetName} detail
              </Link>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
