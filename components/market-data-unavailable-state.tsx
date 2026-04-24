import Link from "next/link";
import clsx from "clsx";

import { GlowCard } from "@/components/ui";
import { getPublicSafeHref } from "@/lib/public-surface-links";
import {
  getPublicDataStateMeta,
  type PublicDataState,
} from "@/lib/product-page-design";

type MarketDataUnavailableStateProps = {
  eyebrow: string;
  title?: string;
  description?: string;
  items?: string[];
  href?: string;
  hrefLabel?: string;
  state?: PublicDataState;
};

export function MarketDataUnavailableState({
  eyebrow,
  title,
  description,
  items = [],
  href,
  hrefLabel,
  state = "unavailable",
}: MarketDataUnavailableStateProps) {
  const meta = getPublicDataStateMeta(state);
  const safeHref = getPublicSafeHref(href);

  return (
    <GlowCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title ?? meta.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/72">{description ?? meta.description}</p>
        </div>
        <div
          className={clsx(
            "rounded-full px-3 py-2 text-xs uppercase tracking-[0.16em]",
            state === "read_failed"
              ? "border border-red-400/20 bg-red-500/10 text-red-100"
              : state === "delayed_snapshot"
                ? "border border-amber-400/20 bg-amber-500/10 text-amber-100"
                : state === "refreshing"
                  ? "border border-sky-400/20 bg-sky-500/10 text-sky-100"
                  : state === "feature_pending"
                    ? "border border-white/12 bg-white/[0.05] text-white/82"
                    : "border border-amber-400/20 bg-amber-500/10 text-amber-100",
          )}
        >
          {meta.label}
        </div>
      </div>
      <div
        className={clsx(
          "mt-5 rounded-[28px] px-6 py-10",
          state === "read_failed"
            ? "border border-dashed border-red-400/20 bg-[#1a0d0d]"
            : state === "delayed_snapshot"
              ? "border border-dashed border-amber-400/20 bg-[#1a1207]"
              : state === "refreshing"
                ? "border border-dashed border-sky-400/20 bg-[#091521]"
                : state === "feature_pending"
                  ? "border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)]"
                  : "border border-dashed border-amber-400/20 bg-[#1a1207]",
        )}
      >
        <p className="text-sm font-medium text-white">{meta.title}</p>
        <p className="mt-3 text-sm leading-7 text-mist/72">{meta.description}</p>
        {items.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-mist/74"
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
        {safeHref && hrefLabel ? (
          <Link
            href={safeHref}
            className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/82 transition hover:border-amber-300/50 hover:text-amber-100"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>
    </GlowCard>
  );
}
