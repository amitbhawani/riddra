import type { Metadata } from "next";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSourceRegistry } from "@/lib/source-registry";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Riddra methodology for trusted market data, source discipline, and content standardization.",
};

export default async function MethodologyPage() {
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const sources = await getSourceRegistry();

  return (
      <GlobalSidebarPageShell
        category="legal"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <div className="space-y-5">
          <Eyebrow>Trust layer</Eyebrow>
          <SectionHeading
            title="How Riddra handles market data and content trust"
            description="Riddra is built to earn trust through disciplined data flow, clear source choices, and page structures that stay honest about what is verified and what is still deepening."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Methodology truth"
          title="This methodology layer is strong for trust explanation, but deeper continuity still depends on launch activation"
          description="Use the methodology page confidently to explain trust and source discipline, while keeping auth continuity, premium follow-through, and support recovery honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry trust-driven users into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full methodology-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium research and trust language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for trust-driven public users who convert."
              : "Support delivery is still not fully active, so the methodology layer should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          {[
            "Official exchanges and regulators first",
            "Structured reusable content instead of one-off pages",
            "Clear fallback behavior before claiming live coverage",
          ].map((item) => (
            <GlowCard key={item}>
              <p className="text-lg font-semibold text-white">{item}</p>
            </GlowCard>
          ))}
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              {config.supportEmail
                ? "Support guidance and contact coverage are available from the visible support channel."
                : "Support guidance is available here, and direct contact details will appear once that channel is ready."}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current source registry</h2>
          <p className="mt-4 text-sm leading-7 text-mist/74">
            These are the source families currently mapped into the platform so public routes can stay consistent about provenance and verification.
          </p>
          <div className="mt-6 grid gap-4">
            {sources.map((source) => (
              <div key={source.code} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{source.sourceName}</p>
                    <p className="mt-2 text-sm text-mist/68">
                      {source.domain} • {source.sourceType}
                    </p>
                  </div>
                  <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                    {source.officialStatus}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/74">{source.notes}</p>
              </div>
            ))}
          </div>
        </GlowCard>
      </GlobalSidebarPageShell>
  );
}
