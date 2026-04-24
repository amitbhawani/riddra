import type { Metadata } from "next";
import Link from "next/link";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { supportOpsItems } from "@/lib/support-ops";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help with onboarding, billing, portfolio imports, and understanding how Riddra works.",
};

export default function HelpPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Help and support</Eyebrow>
          <SectionHeading
            title="Help center"
            description="Use the help center for onboarding, billing, portfolio imports, and product understanding in one public support layer."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Public support truth"
          title="This public help layer is useful now, but it still depends on launch activation and signed-in continuity"
          description="Use this page to explain what help exists today, but keep expectations honest until support delivery, billing recovery, and subscriber identity are all running end to end."
          authReady="Signed-in help continuity is active enough to hand public users into protected support routes."
          authPending="Local preview auth still limits how trustworthy the full signed-in help handoff can be."
          billingReady="Billing core credentials exist, so renewal and charge-support guidance can move beyond pure planning once checkout is exercised."
          billingPending="Billing core credentials are still missing, so billing help remains mostly expectation-setting."
          supportReady="Support delivery is configured enough to begin real end-to-end help-flow testing."
          supportPending="Support delivery is still not fully active, so public help promises should stay conservative."
          href="/account/support"
          hrefLabel="Open signed-in support"
          stats={[
            {
              label: "Support email",
              value: config.supportEmail || "Not configured yet",
            },
            {
              label: "Billing support",
              value: config.billingSupportEmail || config.supportEmail || "Not configured yet",
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

        <div className="grid gap-6 lg:grid-cols-2">
          {supportOpsItems.map((item) => (
            <GlowCard key={item.title}>
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Next routes</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                href: "/account/support",
                label: "Signed-in support",
                note: "Protected route for subscriber support posture, recovery, and configured contact channels.",
              },
              {
                href: "/account/billing/recovery",
                label: "Billing recovery",
                note: "Review renewal, failed-charge, and fallback-access expectations in one place.",
              },
              {
                href: "/contact",
                label: "Contact route",
                note: "Fallback public route when a user needs a visible help destination before sign-in works cleanly.",
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
