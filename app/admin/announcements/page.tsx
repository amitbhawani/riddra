import type { Metadata } from "next";

import { AnnouncementRevisionPanel } from "@/components/announcement-revision-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { announcementRules, announcementSamples, announcementSummary } from "@/lib/announcement-ops";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Protected announcement console for manual company updates, IPO notes, and editorial release handling.",
};

export default async function AnnouncementsPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Announcements", href: "/admin/announcements" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Editorial backend</Eyebrow>
          <SectionHeading
            title="Announcements console"
            description="This page models how manual company updates, IPO milestone notes, and evergreen fund commentary should be managed as first-class CMS records."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked announcements</p>
            <p className="mt-2 text-3xl font-semibold text-white">{announcementSummary.totalTracked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready to publish</p>
            <p className="mt-2 text-3xl font-semibold text-white">{announcementSummary.readyToPublish}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Awaiting review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{announcementSummary.awaitingReview}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Announcement queue</h2>
          <div className="mt-5 grid gap-4">
            {announcementSamples.map((item) => (
              <div key={`${item.assetRef}-${item.headline}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.headline}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.assetRef} · {item.announcementType} · {item.sourceLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.workflowState}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.importance}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <AnnouncementRevisionPanel items={announcementSamples} />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Announcement rules</h2>
          <div className="mt-5 grid gap-3">
            {announcementRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Archive direction</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Announcements should later become searchable event-memory records rather than one-off editorial updates.",
              "Every announcement should stay linked to an asset, date, source, and continuity note so history remains useful.",
              "Results, IPO milestones, and fund commentary should flow into the same durable archive layer as the broader research memory system.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
