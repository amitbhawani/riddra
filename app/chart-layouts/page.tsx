import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { chartLayoutRules, chartLayoutRows, chartLayoutSummary } from "@/lib/chart-layouts";
import { requirePlanTier } from "@/lib/plan-gating";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Chart Layouts",
  description: "Saved chart-layout workstation surface for intraday, swing, IPO, and premium indicator-ready views.",
};

export default async function ChartLayoutsPage() {
  await requirePlanTier("pro", "/chart-layouts");
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
    { name: "Chart Layouts", href: "/chart-layouts" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 4 workstation</Eyebrow>
          <SectionHeading
            title="Chart layouts"
            description="Review saved chart setups for intraday, swing, IPO, and broader market workflows from one layouts hub."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Layout truth"
          title="This layout route is useful for workflow planning, but deeper continuity still depends on launch activation"
          description="Use chart layouts confidently for workflow review, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry saved chart layouts into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full layout-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium layout and repeat-workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium layout promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for chart workflows that convert."
              : "Support delivery is still not fully active, so layout routes should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Saved layouts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{chartLayoutSummary.savedLayouts}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Indicator slots</p>
            <p className="mt-2 text-3xl font-semibold text-white">{chartLayoutSummary.indicatorSlots}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Shared views</p>
            <p className="mt-2 text-3xl font-semibold text-white">{chartLayoutSummary.sharedViews}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Support registry rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-base font-semibold text-white">
              {config.supportEmail || "Not configured yet"}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {chartLayoutRows.map((item) => (
            <GlowCard key={item.title}>
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-mist/74">{item.note}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Layout rules</h2>
          <div className="mt-5 grid gap-3">
            {chartLayoutRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/charts"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open charts
            </Link>
            <Link
              href="/trader-workstation"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Back to workstation
            </Link>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
