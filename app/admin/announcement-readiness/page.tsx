import type { Metadata } from "next";
import Link from "next/link";

import { AnnouncementReadinessRevisionPanel } from "@/components/announcement-readiness-revision-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  announcementAssets,
  announcementChecklist,
  announcementReadinessSummary,
  audienceAngles,
} from "@/lib/announcement-readiness";
import { getAnnouncementReadinessRegistrySummary } from "@/lib/announcement-readiness-registry";

export const metadata: Metadata = {
  title: "Announcement Readiness",
  description: "Protected announcement-readiness surface for public-beta positioning, trust cues, and launch-message discipline.",
};

export default async function AnnouncementReadinessPage() {
  await requireUser();
  const registrySummary = getAnnouncementReadinessRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Announcement Readiness", href: "/admin/announcement-readiness" },
            ]}
          />
          <Eyebrow>Public launch messaging</Eyebrow>
          <SectionHeading
            title="Announcement readiness"
            description="This page keeps public messaging honest. The goal is to make the beta sound confident and exciting without claiming the platform is already the final finished version."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{announcementReadinessSummary.launchMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Confidence label</p>
            <p className="mt-2 text-3xl font-semibold text-white">{announcementReadinessSummary.confidenceLabel}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Messaging state</p>
            <p className="mt-2 text-lg font-semibold text-white">{announcementReadinessSummary.messagingState}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Announcement checklist</h2>
            <div className="mt-5 grid gap-3">
              {announcementChecklist.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{item.detail}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <div className="space-y-6">
            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Public assets to lean on</h2>
              <div className="mt-5 grid gap-3">
                {announcementAssets.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {item}
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Audience angles</h2>
              <div className="mt-5 grid gap-3">
                {audienceAngles.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>

        <AnnouncementReadinessRevisionPanel items={announcementChecklist} />

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Announcement readiness registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines the announcement checklist, launch assets, and audience angles so the public
                messaging rollout can be exported and reviewed outside this page too.
              </p>
            </div>
            <Link
              href="/api/admin/announcement-readiness-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
