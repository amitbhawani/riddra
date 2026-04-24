import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requirePlanTier } from "@/lib/plan-gating";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { traderPresetRows, traderPresetRules, traderPresetSummary } from "@/lib/trader-presets";

export const metadata: Metadata = {
  title: "Trader Presets",
  description: "Review saved trader workflows that combine charts, scanners, alerts, and repeat-use setups.",
};

export default async function TraderPresetsPage() {
  await requirePlanTier("pro", "/trader-presets");
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
    { name: "Trader Presets", href: "/trader-presets" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 4 workstation</Eyebrow>
          <SectionHeading
            title="Trader presets"
            description="Use presets to revisit chart, scanner, option-chain, and alert combinations without rebuilding the same workflow each time."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Preset truth"
          title="This preset route is useful for workflow planning, but deeper continuity still depends on launch activation"
          description="Use trader presets confidently for workflow review, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry saved trader workflows into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full preset-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium preset and repeat-workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium preset promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for trader workflows that convert."
              : "Support delivery is still not fully active, so preset routes should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active presets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{traderPresetSummary.activePresets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Alert presets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{traderPresetSummary.alertPresets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Workflow modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{traderPresetSummary.workflowModes}</p>
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
          {traderPresetRows.map((item) => (
            <GlowCard key={item.title}>
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-mist/74">{item.note}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Preset rules</h2>
          <div className="mt-5 grid gap-3">
            {traderPresetRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/account/inbox"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open inbox
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
