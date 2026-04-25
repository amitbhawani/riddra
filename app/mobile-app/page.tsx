import type { Metadata } from "next";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { mobileReadinessRules, mobileReadinessSummary, mobileReadinessTracks } from "@/lib/mobile-readiness";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Mobile Readiness",
  description: "Riddra mobile-readiness view for app contracts, push planning, sync priorities, and web-to-app continuity.",
};

export default function MobileAppPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  return (
    <GlobalSidebarPageShell
      category="account"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
        <div className="space-y-5">
          <Eyebrow>Phase 12</Eyebrow>
          <SectionHeading
            title="Mobile readiness"
            description="Review the app-ready surfaces, push priorities, and sync rules needed to carry the web experience cleanly onto mobile."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Mobile truth"
          title="Mobile readiness is structurally strong, but the full app handoff still depends on launch activation"
          description="Use this page to frame mobile posture honestly while push delivery, signed-in continuity, billing-linked access, and support follow-through are still being hardened."
          authReady="Signed-in continuity is active enough to carry the web-to-mobile account handoff more credibly."
          authPending="Local preview auth still limits how trustworthy the full web-to-mobile member handoff can be."
          billingReady="Billing-linked access is credible enough to frame mobile member continuity as part of the same subscriber system."
          billingPending="Billing-linked access is still incomplete, so mobile member continuity should stay expectation-setting."
          supportReady="Support delivery is configured enough to backstop mobile onboarding and recovery issues."
          supportPending="Support delivery is still not fully active, so mobile escalation and recovery should stay expectation-setting."
          href="/admin/mobile-qa-matrix"
          hrefLabel="Open mobile QA"
          stats={[
            { label: "App surfaces", value: mobileReadinessSummary.appSurfaces },
            { label: "Push contracts", value: mobileReadinessSummary.pushContracts },
            { label: "Sync priorities", value: mobileReadinessSummary.syncPriorities },
            {
              label: "Support continuity",
              value: supportRegistry.total,
              detail: config.pushProviderKey
                ? "Support and push planning are visible here, with follow-through ready to extend into mobile once rollout is active."
                : "Support and push planning are visible here, and delivery details will appear once mobile rollout is ready.",
            },
          ]}
        />

        <div className="grid gap-6">
          {mobileReadinessTracks.map((track) => (
            <GlowCard key={track.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{track.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{track.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {track.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Mobile rules</h2>
          <div className="mt-5 grid gap-3">
            {mobileReadinessRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
    </GlobalSidebarPageShell>
  );
}
