import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchBlockerRevisionPanel } from "@/components/launch-blocker-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchBlockerLedger } from "@/lib/launch-blocker-ledger";

export const metadata: Metadata = {
  title: "Launch Blocker Ledger",
  description:
    "Protected launch-blocker ledger for the remaining unresolved launch items across control, commitments, decisions, and approvals.",
};

export default async function AdminLaunchBlockerLedgerPage() {
  await requireUser();

  const ledger = getLaunchBlockerLedger();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Blocker Ledger", href: "/admin/launch-blocker-ledger" },
            ]}
          />
          <Eyebrow>Phase 22 blocker ledger</Eyebrow>
          <SectionHeading
            title="Launch blocker ledger"
            description="This page keeps the remaining unresolved launch items in one ledger so the final blockers are easier to assign, review, and clear."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day console
            </Link>
            <Link
              href="/admin/release-gate-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open release gate board
            </Link>
            <Link
              href="/api/admin/launch-blocker-ledger"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download blocker CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Total blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{ledger.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">User-owned</p>
            <p className="mt-2 text-3xl font-semibold text-white">{ledger.userOwned}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Shared-owned</p>
            <p className="mt-2 text-3xl font-semibold text-white">{ledger.sharedOwned}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">QA-linked blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {ledger.items.filter((item) => item.source === "Public launch QA").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Chart-linked blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {ledger.items.filter((item) => item.source === "Chart verification").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Placeholder-linked blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {ledger.items.filter((item) => item.source === "Placeholder honesty").length}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-4">
          {ledger.items.map((item) => (
            <GlowCard key={`${item.source}-${item.title}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                      {item.source}
                    </span>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                      {item.owner}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-mist/76">{item.detail}</p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open source page
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>

        <LaunchBlockerRevisionPanel items={ledger.items} />
      </Container>
    </div>
  );
}
