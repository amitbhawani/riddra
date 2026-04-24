import Link from "next/link";

import { GlowCard } from "@/components/ui";

export type SubscriberRecordBadge = {
  label: string;
  tone?: "default" | "preview";
};

export type SubscriberRecordItem = {
  id: string;
  title: string;
  badges?: SubscriberRecordBadge[];
  meta?: string;
  note?: string;
  footer?: string;
  actionHref?: string;
  actionLabel?: string;
};

type SubscriberRecordGridSectionProps = {
  title: string;
  description?: string;
  items: SubscriberRecordItem[];
};

function getBadgeClassName(tone: SubscriberRecordBadge["tone"] = "default") {
  if (tone === "preview") {
    return "inline-flex rounded-full border border-[rgba(212,133,59,0.28)] bg-[rgba(212,133,59,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8E5723]";
  }

  return "rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.05)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#1B3A6B]";
}

export function SubscriberRecordGridSection({
  title,
  description,
  items,
}: SubscriberRecordGridSectionProps) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-[#1B3A6B]">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{description}</p> : null}
      <div className="mt-5 grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[#1B3A6B]">{item.title}</h3>
                {item.meta ? <p className="text-sm text-[rgba(107,114,128,0.88)]">{item.meta}</p> : null}
              </div>
              {item.badges?.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em]">
                  {item.badges.map((badge) => (
                    <span key={`${item.id}-${badge.label}`} className={getBadgeClassName(badge.tone)}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {item.note ? <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{item.note}</p> : null}
            {item.footer ? <p className="mt-3 text-xs leading-6 text-[rgba(107,114,128,0.8)]">{item.footer}</p> : null}
            {item.actionHref && item.actionLabel ? (
              <Link
                href={item.actionHref}
                className="mt-5 inline-flex rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264a83]"
              >
                {item.actionLabel}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
