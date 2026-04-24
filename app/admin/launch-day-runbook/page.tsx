import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchDayRunbookRevisionPanel } from "@/components/launch-day-runbook-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchExecutionQueue } from "@/lib/launch-execution-queue";
import { getLaunchDayRunbookRegistrySummary } from "@/lib/launch-day-runbook-registry";
import {
  launchDayRunbookFallbacks,
  launchDayRunbookItems,
  launchDayRunbookSummary,
} from "@/lib/launch-day-runbook";

export const metadata: Metadata = {
  title: "Launch Day Runbook",
  description:
    "Protected launch-day-runbook page for same-day sequence, high-risk checkpoints, and launch fallback actions.",
};

export default async function AdminLaunchDayRunbookPage() {
  await requireUser();

  const queue = getLaunchExecutionQueue();
  const registrySummary = getLaunchDayRunbookRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Day Runbook", href: "/admin/launch-day-runbook" },
            ]}
          />
          <Eyebrow>Launch sequence</Eyebrow>
          <SectionHeading
            title="Launch day runbook"
            description="This page turns the current admin planning stack into a same-day launch sequence so activation happens in a controlled order with clear fallback thinking."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day console
            </Link>
            <Link
              href="/admin/activation-sequence"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open activation sequence
            </Link>
            <Link
              href="/admin/live-smoke-tests"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open live smoke tests
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Checkpoints</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchDayRunbookSummary.checkpoints}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">High-risk steps</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchDayRunbookSummary.highRiskSteps}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Fallback actions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchDayRunbookSummary.fallbackActions}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{queue.readyNow}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked queue items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{queue.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Optional today</p>
            <p className="mt-2 text-3xl font-semibold text-white">{queue.optional}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch-day registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines same-day checkpoints, the live execution queue, and fallback actions so the
                release-day sequence can be exported and reviewed outside this page too.
              </p>
            </div>
            <Link
              href="/api/admin/launch-day-runbook-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
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
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {launchDayRunbookItems.map((item) => (
            <GlowCard key={item.step}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.step}</h2>
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
          <h2 className="text-2xl font-semibold text-white">Execution queue</h2>
          <div className="mt-5 grid gap-4">
            {queue.items.map((item) => (
              <div key={`${item.type}-${item.title}`} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.type}</p>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="text-sm leading-7 text-mist/76">{item.detail}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Owner: {item.owner}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open surface
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Fallback actions</h2>
          <div className="mt-5 grid gap-3">
            {launchDayRunbookFallbacks.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchDayRunbookRevisionPanel items={launchDayRunbookItems} />
      </Container>
    </div>
  );
}
