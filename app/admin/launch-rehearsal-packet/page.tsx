import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  getLaunchRehearsalPacketRows,
  getLaunchRehearsalPacketSummary,
} from "@/lib/launch-rehearsal-packet";

export const metadata: Metadata = {
  title: "Launch Rehearsal Packet",
  description:
    "Protected Phase 20 packet that separates completed QA infrastructure from the remaining config and human rehearsal steps.",
};

export default async function AdminLaunchRehearsalPacketPage() {
  await requireUser();

  const rows = getLaunchRehearsalPacketRows();
  const summary = getLaunchRehearsalPacketSummary();
  const readinessItems = rows.map((row) => ({
    label: `${row.lane}: ${row.label}`,
    status: row.status,
    detail: `${row.detail} Evidence: ${row.evidence}`,
    routeTarget: row.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Rehearsal Packet", href: "/admin/launch-rehearsal-packet" },
            ]}
          />
          <Eyebrow>Phase 20 rehearsal handoff</Eyebrow>
          <SectionHeading
            title="Launch rehearsal packet"
            description="This is the final handoff for public launch QA. The registries, boards, and evidence packet are built; what remains is config completion and human rehearsal across the launch-critical paths."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/public-launch-qa"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open public launch QA
            </Link>
            <Link
              href="/api/admin/launch-rehearsal-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download packet CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Rehearsal lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Build-complete lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs config</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.needsConfig}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs rehearsal</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.needsRehearsal}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Launch rehearsal lanes</h2>
          <div className="mt-5 grid gap-4">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="launch rehearsal lane"
              panelTitle="Write-through launch rehearsal action"
              panelDescription="Log config and rehearsal changes into the shared revision lane so public-launch rehearsal posture stops living only as a static packet."
              defaultRouteTarget="/admin/launch-rehearsal-packet"
              defaultOperator="Launch Rehearsal Operator"
              defaultChangedFields="rehearsal_lane, config_state, rehearsal_state"
              actionNoun="launch-rehearsal mutation"
            />
            {rows.map((row) => (
              <div key={`${row.lane}-${row.label}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-mist/68">{row.lane}</p>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                        {row.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{row.label}</h3>
                    <p className="text-sm leading-7 text-mist/74">{row.detail}</p>
                    <p className="text-sm leading-7 text-mist/62">Evidence: {row.evidence}</p>
                  </div>
                  <Link
                    href={row.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open lane
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
