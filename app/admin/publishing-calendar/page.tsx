import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublishingReleaseRevisionPanel } from "@/components/publishing-release-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  publishingCalendarItems,
  publishingCalendarSummary,
  publishingReleaseRules,
} from "@/lib/publishing-ops";

export const metadata: Metadata = {
  title: "Publishing Calendar",
  description: "Protected publishing-calendar page for scheduled editorial releases, event-driven content timing, and release-window planning.",
};

export default async function PublishingCalendarPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Publishing Calendar", href: "/admin/publishing-calendar" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Editorial backend</Eyebrow>
          <SectionHeading
            title="Publishing calendar"
            description="This calendar models how stock, IPO, fund, and learning updates should be scheduled so the editorial system can scale beyond ad hoc live edits."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Scheduled today</p>
            <p className="mt-2 text-3xl font-semibold text-white">{publishingCalendarSummary.scheduledToday}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">High priority</p>
            <p className="mt-2 text-3xl font-semibold text-white">{publishingCalendarSummary.highPriority}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Release windows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{publishingCalendarSummary.releaseWindows}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Scheduled items</h2>
          <div className="mt-5 grid gap-4">
            {publishingCalendarItems.map((item) => (
              <div key={`${item.assetRef}-${item.title}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.assetRef} · {item.publishWindow}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs text-mist/60">Owner: {item.owner}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <PublishingReleaseRevisionPanel items={publishingCalendarItems} />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Release rules</h2>
          <div className="mt-5 grid gap-3">
            {publishingReleaseRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
