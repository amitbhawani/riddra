import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getConfiguredSupportEmail } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Current terms summary for Riddra's research, tracking, and educational product experience.",
};

export default function TermsPage() {
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Terms of Use", href: "/terms" },
  ];

  return (
      <GlobalSidebarPageShell
        category="legal"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Trust layer</Eyebrow>
          <SectionHeading
            title="Terms of use"
            description="This page defines Riddra's current role as a research, tracking, and educational product, not an execution broker."
          />
        </div>
        <SubscriberTruthNotice
          eyebrow="Trust truth"
          title="This terms page is useful for launch trust, but final continuity still depends on activation and legal hardening"
          description="Use this operating terms summary confidently for the current launch phase, while keeping support continuity, signed-in posture, and final legal review honest until the live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to make subscriber-role and usage expectations more concrete."
              : "Local preview auth still limits how confidently subscriber-role expectations can be framed.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin handling real terms and account follow-through."
              : "Support delivery is still not fully active, so legal-contact expectations should stay conservative.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so subscriber-access language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so subscriber-access promises should stay expectation-setting.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />
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
            <p className="mt-2 text-base font-semibold text-white">{supportEmail || "Not configured yet"}</p>
          </GlowCard>
        </div>
        <GlowCard className="space-y-4 text-sm leading-7 text-mist/74">
          <p>Riddra is presented as a market intelligence and subscriber-tools platform, not as a broker or investment advisor under the current product scope.</p>
          <p>Public content, tracker outputs, and learning material are designed to help users research better, but users remain responsible for their own investment decisions.</p>
          <p>Subscriber features, imported portfolios, and alerts are provided on a best-effort basis until the final production data stack is fully connected and documented.</p>
          <p>This is the current operating terms summary for launch. Reviewed legal terms replace it before broader commercialization.</p>
        </GlowCard>
      </GlobalSidebarPageShell>
  );
}
