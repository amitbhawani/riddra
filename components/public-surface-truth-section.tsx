import Link from "next/link";

import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { GlowCard } from "@/components/ui";
import { getPublicSafeHref } from "@/lib/public-surface-links";

type PublicSurfaceTruthStat = {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  hrefLabel?: string;
};

type PublicSurfaceTruthSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  authReady: string;
  authPending: string;
  billingReady: string;
  billingPending: string;
  supportReady: string;
  supportPending: string;
  href?: string;
  hrefLabel?: string;
  secondaryHref?: string;
  secondaryHrefLabel?: string;
  supportScope?: "account" | "admin";
  stats?: PublicSurfaceTruthStat[];
};

export function PublicSurfaceTruthSection({
  eyebrow,
  href,
  hrefLabel,
  secondaryHref,
  secondaryHrefLabel,
}: PublicSurfaceTruthSectionProps) {
  const statCards: PublicSurfaceTruthStat[] = [
    {
      label: "Account tools",
      value: "Available",
      detail: "Sign in to save pages, build watchlists, and manage your portfolio workspace.",
    },
    {
      label: "Membership access",
      value: "Protected",
      detail: "Premium areas show clear upgrade prompts when a higher access level is needed.",
    },
    {
      label: "Help",
      value: "Ready",
      detail: "Support links point users to account and membership help without exposing setup details.",
    },
  ];
  const safeHref = getPublicSafeHref(href);
  const safeSecondaryHref = getPublicSafeHref(secondaryHref);
  const gridClass =
    statCards.length === 1
      ? "grid gap-6"
      : statCards.length === 2
        ? "grid gap-6 lg:grid-cols-2"
        : statCards.length >= 5
      ? "grid gap-6 xl:grid-cols-5"
      : statCards.length === 4
        ? "grid gap-6 lg:grid-cols-4"
        : "grid gap-6 lg:grid-cols-3";

  return (
    <>
      <SubscriberTruthNotice
        eyebrow={eyebrow}
        title="Page tools and access"
        description="This page is ready for browsing. Sign in when you want to save items, manage account tools, or unlock member-only areas."
        items={[
          "Account actions use the signed-in member workspace.",
          "Membership prompts appear only where extra access is needed.",
          "Help links stay available for account and access questions.",
        ]}
        href={safeHref}
        hrefLabel={hrefLabel}
        secondaryHref={safeSecondaryHref}
        secondaryHrefLabel={secondaryHrefLabel}
      />

      <div className={gridClass}>
        {statCards.map((item) => (
          <GlowCard key={`${item.label}-${item.value}`}>
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">{item.label}</p>
            <p className="riddra-product-number mt-2 text-[24px] font-semibold text-[#1B3A6B]">{item.value}</p>
            {item.detail ? (
              <p className="riddra-product-body mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{item.detail}</p>
            ) : null}
            {getPublicSafeHref(item.href) && item.hrefLabel ? (
              <Link
                href={getPublicSafeHref(item.href)!}
                className="mt-4 inline-flex rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
              >
                {item.hrefLabel}
              </Link>
            ) : null}
          </GlowCard>
        ))}
      </div>
    </>
  );
}
