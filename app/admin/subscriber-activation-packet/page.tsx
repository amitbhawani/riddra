import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  getSubscriberActivationPacketRows,
  getSubscriberActivationPacketSummary,
} from "@/lib/subscriber-activation-packet";

export const metadata: Metadata = {
  title: "Subscriber Activation Packet",
  description:
    "Protected Phase 19 packet that separates completed subscriber build work from the remaining credential and verification handoff.",
};

export default async function AdminSubscriberActivationPacketPage() {
  await requireUser();

  const rows = getSubscriberActivationPacketRows();
  const summary = getSubscriberActivationPacketSummary();
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
              { name: "Subscriber Activation Packet", href: "/admin/subscriber-activation-packet" },
            ]}
          />
          <Eyebrow>Phase 19 activation handoff</Eyebrow>
          <SectionHeading
            title="Subscriber activation packet"
            description="This page is the final handoff for subscriber truth. Build-side account, billing, entitlement, support, and workspace surfaces are complete; what remains is config and end-to-end verification."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/subscriber-launch-readiness"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open readiness desk
            </Link>
            <Link
              href="/api/admin/subscriber-activation-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download packet CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Activation lanes</p>
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
            <p className="text-sm text-mist/68">Needs verification</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.needsVerification}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Activation lanes</h2>
          <div className="mt-5 grid gap-4">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="subscriber activation lane"
              panelTitle="Write-through subscriber activation action"
              panelDescription="Log subscriber activation handoff and verification changes into the shared revision lane so final subscriber rollout posture stops living only as a static packet."
              defaultRouteTarget="/admin/subscriber-activation-packet"
              defaultOperator="Subscriber Activation Operator"
              defaultChangedFields="activation_lane, config_status, verification_status"
              actionNoun="subscriber-activation mutation"
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
