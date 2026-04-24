import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getConfiguredSupportEmail } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Current privacy summary for Riddra accounts, portfolios, alerts, and support requests.",
};

export default function PrivacyPage() {
  const supportEmail = getConfiguredSupportEmail();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Privacy Policy", href: "/privacy" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Trust layer</Eyebrow>
          <SectionHeading
            title="Privacy policy"
            description="This page summarizes how Riddra currently handles account data, portfolio uploads, alerts, and support requests."
          />
        </div>
        <SubscriberTruthNotice
          eyebrow="Trust truth"
          title="This privacy page is useful for launch trust, but final continuity still depends on activation and legal hardening"
          description="Use this operating privacy summary confidently for the current launch phase, while keeping support continuity, signed-in posture, and final legal review honest until the live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to make account and consent expectations more concrete."
              : "Local preview auth still limits how confidently the account and consent posture can be framed.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin handling real privacy and account follow-through."
              : "Support delivery is still not fully active, so privacy-contact expectations should stay conservative.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so subscriber-policy language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so subscriber-policy promises should stay expectation-setting.",
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
          <p>Riddra collects only the information needed to provide accounts, portfolio tools, alerts, and product improvements.</p>
          <p>Portfolio data, imported files, and notification preferences are treated as sensitive user data and used only for the workflows they enable.</p>
          <p>Email, WhatsApp, SMS, and mobile-alert channels follow explicit user preferences and clear unsubscribe controls.</p>
          <p>
            {supportEmail
              ? `Current support contact for privacy or account-related requests: ${supportEmail}.`
              : "Privacy and account-related requests are handled through the current launch support channel."}
          </p>
          <p>This is the current operating privacy summary for launch. A fuller reviewed legal version replaces it before wider marketing scale begins.</p>
        </GlowCard>
      </Container>
    </div>
  );
}
