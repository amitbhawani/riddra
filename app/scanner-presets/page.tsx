import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requirePlanTier } from "@/lib/plan-gating";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { scannerPresetRows, scannerPresetRules, scannerPresetSummary } from "@/lib/scanner-presets";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Scanner Presets",
  description: "Scanner-preset workstation surface for repeat intraday workflows, shareable setups, and trader memory.",
};

export default async function ScannerPresetsPage() {
  await requirePlanTier("pro", "/scanner-presets");
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Trader Workstation", href: "/trader-workstation" },
    { name: "Scanner Presets", href: "/scanner-presets" },
  ];

  return (
    <GlobalSidebarPageShell
      category="charts"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 4 workstation</Eyebrow>
          <SectionHeading
            title="Scanner presets"
            description="Save repeat scanner setups for intraday ideas, event-led screens, and research stacks you want to revisit quickly."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Preset truth"
          title="This preset route is useful for workflow planning, but deeper continuity still depends on launch activation"
          description="Use scanner presets confidently for trader workflow review, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry saved scanner workflows into account and workspace flows."
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
            <p className="text-sm text-mist/68">Live presets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scannerPresetSummary.livePresets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Intraday stacks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scannerPresetSummary.intradayStacks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Shareable views</p>
            <p className="mt-2 text-3xl font-semibold text-white">{scannerPresetSummary.shareableViews}</p>
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
          {scannerPresetRows.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm text-mist/66">{item.type}</p>
                </div>
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  Preset
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/74">{item.note}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Preset rules</h2>
          <div className="mt-5 grid gap-3">
            {scannerPresetRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/screener"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open screener
            </Link>
            <Link
              href="/trader-workstation"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Back to workstation
            </Link>
          </div>
        </GlowCard>
    </GlobalSidebarPageShell>
  );
}
