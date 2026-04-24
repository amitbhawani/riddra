import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { getPublicSafeHref } from "@/lib/public-surface-links";

type ChartFallbackNoticeProps = {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel?: string;
  hints?: string[];
  href?: string;
  hrefLabel?: string;
};

export function ChartFallbackNotice({
  eyebrow,
  title,
  description,
  statusLabel,
  hints = [],
  href,
  hrefLabel,
}: ChartFallbackNoticeProps) {
  const safeHref = getPublicSafeHref(href);

  return (
    <GlowCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/72">{description}</p>
        </div>
        {statusLabel ? (
          <div className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/80">
            {statusLabel}
          </div>
        ) : null}
      </div>
      <div className="mt-5 rounded-[28px] border border-dashed border-white/12 bg-[#07111a] px-6 py-10">
        <p className="text-sm font-medium text-white">Stable launch-safe chart posture</p>
        <p className="mt-3 text-sm leading-7 text-mist/72">
          This route is intentionally showing an honest waiting or proxy state instead of falling back to a flaky hosted chart experience.
        </p>
        {hints.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {hints.map((hint) => (
              <div key={hint} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-mist/74">
                {hint}
              </div>
            ))}
          </div>
        ) : null}
        {safeHref && hrefLabel ? (
          <Link
            href={safeHref}
            className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/82 transition hover:border-aurora/50 hover:text-aurora"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>
    </GlowCard>
  );
}
