import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  segmentPlaybookItems,
  segmentPlaybookRules,
  segmentPlaybooksSummary,
} from "@/lib/segment-playbooks";

export const metadata: Metadata = {
  title: "Segment Playbooks",
  description:
    "Protected segment-playbooks page for lifecycle journeys across acquisition, activation, retention, expansion, and trust recovery.",
};

export default async function AdminSegmentPlaybooksPage() {
  await requireUser();

  const readinessItems = segmentPlaybookItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Investor activation playbooks"
        ? "/admin/crm-ops"
        : item.title === "Subscriber expansion playbooks"
          ? "/admin/subscription-matrix"
          : item.title === "Trust repair and recovery playbooks"
            ? "/admin/trust-signoff"
            : "/admin/segment-playbooks",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Segment Playbooks", href: "/admin/segment-playbooks" },
            ]}
          />
          <Eyebrow>Lifecycle design</Eyebrow>
          <SectionHeading
            title="Segment playbooks"
            description="This page turns lifecycle segmentation into operator-ready playbooks so acquisition, activation, retention, expansion, and recovery can later run from repeatable patterns."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Segment families</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {segmentPlaybooksSummary.segmentFamilies}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Playbook tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {segmentPlaybooksSummary.playbookTracks}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recovery paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {segmentPlaybooksSummary.recoveryPaths}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="segment playbook"
              panelTitle="Write-through segment-playbook action"
              panelDescription="Log segment-playbook changes into the shared revision lane so acquisition, activation, retention, and recovery posture stop living only as a lifecycle design board."
              defaultRouteTarget="/admin/segment-playbooks"
              defaultOperator="Segment Playbook Operator"
              defaultChangedFields="segment_family, playbook_track, recovery_path"
              actionNoun="segment-playbook mutation"
            />
          </GlowCard>
          {segmentPlaybookItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Playbook rules</h2>
          <div className="mt-5 grid gap-3">
            {segmentPlaybookRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
