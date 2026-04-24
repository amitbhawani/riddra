import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Placeholder terms-of-service page for Riddra launch and third-party verification flows.",
};

export default function LegalTosPage() {
  const config = getRuntimeLaunchConfig();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Legal", href: "/legal/tos" },
    { name: "Terms of Service", href: "/legal/tos" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Legal</Eyebrow>
          <SectionHeading
            title="Terms of service"
            description="This is a simple placeholder TOS page for launch and third-party verification flows."
          />
        </div>
        <PublicSurfaceTruthSection
          eyebrow="Legal terms truth"
          title="This terms page is useful for launch trust, but final continuity still depends on activation and legal hardening"
          description="Use this operating terms summary confidently for the current launch phase, while keeping support continuity, signed-in posture, and final legal review honest until the live paths are fully verified."
          authReady="Signed-in continuity is active enough to make account-access expectations more concrete."
          authPending="Local preview auth still limits how confidently the account-access posture can be framed."
          billingReady="Billing core credentials exist, so subscriber-terms language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so subscriber-terms promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin handling real terms and access follow-through."
          supportPending="Support delivery is still not fully active, so legal-contact expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />
        <GlowCard className="space-y-4 text-sm leading-7 text-mist/74">
          <p>Riddra is currently publishing this placeholder terms-of-service page so required legal URLs exist during launch setup and external platform onboarding.</p>
          <p>Detailed commercial terms, subscription rules, refund language, permitted-use clauses, and risk disclosures are still pending final review and will be added here later.</p>
          <p>Until the final legal copy is published, this page should be treated as a temporary public placeholder rather than the full operating terms for the service.</p>
          <p>
            {config.supportEmail
              ? `Questions about current access or legal placeholders can be directed to ${config.supportEmail}.`
              : "Questions about current access or legal placeholders can be directed through the current launch support channel."}
          </p>
        </GlowCard>
      </Container>
    </div>
  );
}
