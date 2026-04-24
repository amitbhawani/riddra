import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchEvidenceActionMemory } from "@/lib/launch-evidence-action-memory-store";
import { getLaunchSignoffPacket } from "@/lib/launch-signoff-packet";

export const metadata: Metadata = {
  title: "Launch Signoff Packet",
  description:
    "Protected launch-signoff packet for the final launch brief across blockers, owners, commitments, and signoff actions.",
};

export default async function AdminLaunchSignoffPacketPage() {
  await requireUser();

  const packet = getLaunchSignoffPacket();
  const evidenceMemory = await getLaunchEvidenceActionMemory();
  const missingProofItems = evidenceMemory.items.filter(
    (item) =>
      item.actionStatus !== "Captured" ||
      !item.proof.trim() ||
      !item.owner.trim(),
  );
  const readinessItems = [
    ...packet.topActions.map((action) => ({
      label: action.title,
      status: "Blocked",
      detail: action.detail,
      routeTarget: action.href,
    })),
    ...missingProofItems.slice(0, 6).map((item) => ({
      label: item.label,
      status: item.actionStatus === "Captured" ? "Ready" : "In progress",
      detail: `${item.note} Next step: ${item.nextStep}`,
      routeTarget: item.href,
    })),
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Signoff Packet", href: "/admin/launch-signoff-packet" },
            ]}
          />
          <Eyebrow>Phase 22 signoff brief</Eyebrow>
          <SectionHeading
            title="Launch signoff packet"
            description="Use this page as the concise launch brief. It compresses the latest launch state into one review packet so the final public decision is easier to defend and hand off."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch day console
            </Link>
            <Link
              href="/admin/launch-owner-inbox"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open owner inbox
            </Link>
            <Link
              href="/admin/launch-blocker-ledger"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open blocker ledger
            </Link>
            <Link
              href="/api/admin/launch-evidence-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download evidence CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Console status</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.status}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.blockedChecks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Open owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.openOwners}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending approvals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.pendingApprovals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.blockerCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">User-owned blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.userOwnedBlockers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Shared blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.sharedOwnedBlockers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked commitments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.blockedCommitments}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.evidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.readyEvidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.inProgressEvidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{packet.blockedEvidenceLanes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Captured proof</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.captured}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs refresh</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.needsRefresh}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Assigned proof owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.assigned}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Proof attached</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.proofAttached}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="launch signoff lane"
            panelTitle="Write-through launch signoff action"
            panelDescription="Log owner signoff, blocker, and missing-proof changes into the shared revision lane so final launch signoff stops living only as a static brief."
            defaultRouteTarget="/admin/launch-signoff-packet"
            defaultOperator="Launch Signoff Operator"
            defaultChangedFields="signoff_owner, blocker_state, evidence_proof"
            actionNoun="launch-signoff mutation"
          />
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Blocked evidence lanes</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {packet.blockingEvidenceLanes.length > 0 ? (
              packet.blockingEvidenceLanes.map((lane) => (
                <span
                  key={lane}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100"
                >
                  {lane} blocked
                </span>
              ))
            ) : (
              <span className="rounded-full border border-bloom/20 bg-bloom/8 px-3 py-1 text-xs uppercase tracking-[0.16em] text-bloom">
                No blocked evidence lanes
              </span>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Evidence capture posture</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/76">
                These are the evidence lanes that still need owner assignment, fresh proof, or a stronger operator update before the final signoff brief can count as defended.
              </p>
            </div>
            <Link
              href="/admin/launch-evidence-board#launch-evidence-action-panel"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Update evidence actions
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {missingProofItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                        {item.actionStatus}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/74">{item.note}</p>
                    <p className="text-sm leading-7 text-mist/74">
                      Owner:
                      <span className="ml-2">{item.owner || "Unassigned"}</span>
                    </p>
                    <p className="text-sm leading-7 text-mist/74">
                      Proof:
                      <span className="ml-2">{item.proof || "Missing current proof."}</span>
                    </p>
                    <p className="text-sm leading-7 text-mist/74">
                      Next step:
                      <span className="ml-2">{item.nextStep}</span>
                    </p>
                  </div>
                  <Link className="text-sm text-aqua underline-offset-4 hover:underline" href={item.href}>
                    Open lane
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Top signoff actions</h2>
          <div className="mt-5 grid gap-4">
            {packet.topActions.map((action) => (
              <div
                key={`${action.title}-${action.href}`}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{action.title}</h3>
                  <p className="text-sm leading-7 text-mist/74">{action.detail}</p>
                </div>
                <Link className="text-sm text-aqua underline-offset-4 hover:underline" href={action.href}>
                  Open action
                </Link>
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
