import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Current privacy summary for Riddra accounts, portfolios, alerts, and support requests.",
};

export default function LegalPrivacyPolicyPage() {
  const config = getRuntimeLaunchConfig();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Legal", href: "/legal/privacy-policy" },
    { name: "Privacy Policy", href: "/legal/privacy-policy" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Legal</Eyebrow>
          <SectionHeading
            title="Privacy policy"
            description="This is a simple privacy-policy page for launch and third-party verification flows."
          />
        </div>
        <PublicSurfaceTruthSection
          eyebrow="Legal trust truth"
          title="This legal privacy page is useful for launch trust, but final continuity still depends on activation and legal hardening"
          description="Use this privacy summary confidently for the current launch phase, while keeping support continuity, signed-in posture, and final legal review honest until the live paths are fully verified."
          authReady="Signed-in continuity is active enough to make account and consent expectations more concrete."
          authPending="Local preview auth still limits how confidently the account and consent posture can be framed."
          billingReady="Billing core credentials exist, so subscriber-policy language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so subscriber-policy promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin handling real privacy and account follow-through."
          supportPending="Support delivery is still not fully active, so privacy-contact expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />
        <GlowCard className="space-y-4 text-sm leading-7 text-mist/74">
          <p>Riddra collects only the information needed to provide accounts, portfolio tools, alerts, and product improvements.</p>
          <p>Portfolio data, imported files, and notification preferences are treated as sensitive user data and used only for the workflows they enable.</p>
          <p>Email, WhatsApp, SMS, and mobile-alert channels follow explicit user preferences and clear unsubscribe controls.</p>
          <p>
            {config.supportEmail
              ? `Current support contact for privacy or account-related requests: ${config.supportEmail}.`
              : "Privacy and account-related requests are handled through the current launch support channel."}
          </p>
          <p>
            This is a launch-ready placeholder privacy-policy page so the public URL can be shared with third-party platforms while the longer reviewed legal copy is finalized.
          </p>
        </GlowCard>
      </Container>
    </div>
  );
}
