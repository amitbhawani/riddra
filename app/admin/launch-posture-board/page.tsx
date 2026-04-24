import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchPostureRevisionPanel } from "@/components/launch-posture-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchPostureBoard } from "@/lib/launch-posture-board";

export const metadata: Metadata = {
  title: "Launch Posture Board",
  description:
    "Protected launch-posture board for current mode, recommended mode, public scope boundaries, and the blockers that still shape the launch call.",
};

export default async function AdminLaunchPostureBoardPage() {
  await requireUser();

  const board = getLaunchPostureBoard();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Posture Board", href: "/admin/launch-posture-board" },
            ]}
          />
          <Eyebrow>Phase 22 launch posture</Eyebrow>
          <SectionHeading
            title="Launch posture board"
            description="This page keeps launch mode, scope boundaries, and recommendation logic in one place so the public posture is easier to review before broad promotion."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-mode"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch mode
            </Link>
            <Link
              href="/admin/launch-scope"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch scope
            </Link>
            <Link
              href="/admin/launch-decision"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch decision
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Active mode</p>
            <p className="mt-2 text-2xl font-semibold text-white">{board.activeMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recommended mode</p>
            <p className="mt-2 text-2xl font-semibold text-white">{board.recommendedMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch visible</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.launchVisible}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Gated or review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.gatedOrHidden}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocking posture checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockingCount}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Posture blockers</h2>
          <div className="mt-5 grid gap-4">
            {board.blockers.map((blocker) => (
              <div key={blocker.title} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{blocker.title}</h3>
                    <p className="text-sm leading-7 text-mist/76">{blocker.detail}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">
                      Required for: {blocker.requiredFor.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {blocker.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchPostureRevisionPanel items={board.blockers} />
      </Container>
    </div>
  );
}
