import type { ReactNode } from "react";
import Link from "next/link";

import { GlowCard } from "@/components/ui";
import { getPublicSafeHref } from "@/lib/public-surface-links";

export type SubscriberAuditStat = {
  label: string;
  value: ReactNode;
  detail?: string;
};

type SubscriberAuditSectionProps = {
  title: string;
  description: string;
  headline: string;
  stats: SubscriberAuditStat[];
  downloadHref: string;
  downloadLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  embedded?: boolean;
};

function getGridClassName(count: number) {
  if (count <= 2) {
    return "grid gap-4 md:grid-cols-2";
  }

  if (count === 3) {
    return "grid gap-4 md:grid-cols-3";
  }

  if (count === 4) {
    return "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
  }

  if (count <= 6) {
    return "grid gap-4 md:grid-cols-3 xl:grid-cols-6";
  }

  return "grid gap-4 md:grid-cols-4 xl:grid-cols-8";
}

export function SubscriberAuditSection({
  title,
  description,
  headline,
  stats,
  downloadHref,
  downloadLabel,
  secondaryHref,
  secondaryLabel,
  embedded = false,
}: SubscriberAuditSectionProps) {
  const safeSecondaryHref = getPublicSafeHref(secondaryHref);

  const content = (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#1B3A6B]">{title}</h2>
          <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">{description}</p>
          <p className="text-lg font-semibold text-[#1B3A6B]">{headline}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={downloadHref}
            className="rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264a83]"
          >
            {downloadLabel}
          </Link>
          {safeSecondaryHref && secondaryLabel ? (
            <Link
              href={safeSecondaryHref}
              className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <div className={["mt-5", getGridClassName(stats.length)].join(" ")}>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
            <p className="text-sm text-[rgba(107,114,128,0.88)]">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#1B3A6B]">{stat.value}</p>
            {stat.detail ? <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{stat.detail}</p> : null}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="mt-5 rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] p-5">{content}</div>;
  }

  return <GlowCard>{content}</GlowCard>;
}
