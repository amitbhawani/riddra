import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchOwnerMatrixRevisionPanel } from "@/components/launch-owner-matrix-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  launchOwnerMatrixItems,
  launchOwnerMatrixRules,
  launchOwnerMatrixSummary,
} from "@/lib/launch-owner-matrix";

export const metadata: Metadata = {
  title: "Launch Owner Matrix",
  description:
    "Protected launch-owner-matrix page for owner accountability, critical blocks, and same-day launch responsibilities.",
};

export default async function AdminLaunchOwnerMatrixPage() {
  await requireUser();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Owner Matrix", href: "/admin/launch-owner-matrix" },
            ]}
          />
          <Eyebrow>Owner accountability</Eyebrow>
          <SectionHeading
            title="Launch owner matrix"
            description="This page keeps launch-critical responsibilities visible by lane so product, credentials, content, and rollout decisions always have a real owner."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Owner lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchOwnerMatrixSummary.ownerLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Critical blocks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchOwnerMatrixSummary.criticalBlocks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Same-day items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchOwnerMatrixSummary.sameDayItems}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {launchOwnerMatrixItems.map((item) => (
            <GlowCard key={item.lane}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.lane}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="grid gap-2 text-right">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.priority}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.owner}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Owner rules</h2>
          <div className="mt-5 grid gap-3">
            {launchOwnerMatrixRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchOwnerMatrixRevisionPanel items={launchOwnerMatrixItems} />
      </Container>
    </div>
  );
}
