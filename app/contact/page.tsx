import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContactRequestPanel } from "@/components/contact-request-panel";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getConfiguredSupportEmail, getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Contact",
  description: "Support, partnership, and launch-contact page for Riddra.",
};

export default function ContactPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const supportEmail = getConfiguredSupportEmail();
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Support layer</Eyebrow>
          <SectionHeading
            title="Contact"
            description="Reach the team for support, partnership conversations, contributor questions, or launch-related help."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Contact truth"
          title="This contact route is a real public destination, but the full support stack is still activating"
          description="Use this page as the public fallback for support and launch contact, while keeping delivery, billing recovery, and signed-in case continuity honest."
          authReady="Signed-in continuity is active enough to hand users toward the protected account-support route when needed."
          authPending="Local preview auth still limits how trustworthy the full signed-in support handoff can be."
          billingReady="Billing core credentials exist, so payment and renewal questions can be handed into the billing lane more credibly."
          billingPending="Billing credentials are still incomplete, so payment help should stay framed as preparation and follow-up."
          supportReady="Support delivery is configured enough to start verifying real help and response flows."
          supportPending="Support delivery is still not fully active, so this route should be framed as a visible contact destination rather than a hardened helpdesk."
          href="/account/support"
          hrefLabel="Open signed-in support"
          stats={[
            {
              label: "Support email",
              value: supportEmail || "Not configured yet",
            },
            {
              label: "Billing support",
              value: config.billingSupportEmail || supportEmail || "Not configured yet",
            },
            {
              label: "Feedback inbox",
              value: config.feedbackInbox || "Not configured yet",
            },
            {
              label: "Support registry rows",
              value: supportRegistry.total,
              detail: `${supportRegistry.inProgress} in progress and ${supportRegistry.blocked} still blocked.`,
            },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white">Support</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Use this page when you need help with signups, portfolio imports, account access, or general platform questions.
            </p>
            <p className="mt-4 text-sm leading-7 text-white">
              {supportEmail ? `Current support contact: ${supportEmail}` : "Support contact is shared during the current launch rollout."}
            </p>
          </GlowCard>
          <GlowCard>
            <h2 className="text-xl font-semibold text-white">Partnerships</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Reach out here for broker, education, data, media, or product-collaboration conversations.
            </p>
          </GlowCard>
          <GlowCard>
            <h2 className="text-xl font-semibold text-white">Creator-led brand</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              This page also helps connect the product with the educational and creator side of the brand in a more personal way.
            </p>
          </GlowCard>
        </div>

        <ContactRequestPanel />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Next support routes</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                href: "/help",
                label: "Help center",
                note: "Public onboarding, billing, and product guidance in one support layer.",
              },
              {
                href: "/account/support",
                label: "Signed-in support",
                note: "Protected route for subscriber-safe recovery posture and configured support channels.",
              },
              {
                href: "/account/billing/recovery",
                label: "Billing recovery",
                note: "Review renewal, failed-charge, and fallback-access expectations in one place.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">{item.label}</span>
                <span className="mt-2 block text-mist/70">{item.note}</span>
              </Link>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
