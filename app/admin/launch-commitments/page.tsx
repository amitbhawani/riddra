import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchCommitmentRevisionPanel } from "@/components/launch-commitment-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";

export const metadata: Metadata = {
  title: "Launch Commitments",
  description:
    "Protected launch-commitments page for the remaining auth, payment, support, live-data, and trust blockers before broad public promises.",
};

function tone(status: string) {
  if (status === "Ready") return "bg-bloom/12 text-bloom";
  if (status === "In progress") return "bg-flare/12 text-flare";
  if (status === "Deferred") return "bg-white/10 text-mist/80";
  return "bg-white/10 text-white";
}

export default async function AdminLaunchCommitmentsPage() {
  await requireUser();

  const items = getLaunchCommitmentItems();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Commitments", href: "/admin/launch-commitments" },
            ]}
          />
          <Eyebrow>Phase 22 commitments</Eyebrow>
          <SectionHeading
            title="Launch commitments"
            description="This page keeps the remaining broad-public commitments in one place so auth, billing, support, live data, and trust promises are reviewed together instead of as disconnected checklist fragments."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day console
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Deferred</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Deferred").length}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {items.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${tone(item.status)}`}>
                      {item.status}
                    </div>
                  </div>
                  <p className="max-w-4xl text-sm leading-7 text-mist/76">{item.detail}</p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open related surface
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>

        <LaunchCommitmentRevisionPanel items={items} />
      </Container>
    </div>
  );
}
