import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRecordGridSection } from "@/components/subscriber-record-grid-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accountSetupItems } from "@/lib/get-started";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberActivationPacketSummary } from "@/lib/subscriber-activation-packet";

export const metadata: Metadata = {
  title: "Account Setup",
  description: "Riddra account setup route for onboarding intent, alerts, and portfolio-start flows.",
};

export default async function AccountSetupPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const activationPacket = getSubscriberActivationPacketSummary();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Setup", href: "/account/setup" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Account Setup",
          description: "Riddra account setup route for onboarding intent, alerts, and portfolio-start flows.",
          path: "/account/setup",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber setup</Eyebrow>
          <SectionHeading
            title="Set up your account"
            description={`Welcome ${user.email}. Use this page to move straight into alerts, inbox, watchlists, and portfolio after sign-in.`}
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Setup truth"
          title="Account setup is still a guided preview flow"
          description="This route is useful for directing the first signed-in session, but it still reflects staged subscriber assumptions rather than fully durable onboarding state. Use it as the right handoff hub, not as proof that identity, preferences, and habit-loop setup are already fully persisted."
          items={[
            truth.hasLiveAuthContinuity
              ? "Auth continuity is strong enough to keep validating the post-login setup journey."
              : "The app still leans on local preview auth, so real outside-user setup continuity is not yet proven.",
            truth.hasPriorityAlertChannels
              ? "Priority alert channels are configured enough to start deeper onboarding and notification validation."
              : "Alert-channel activation still needs real delivery setup before setup preferences can be treated as live user controls.",
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <SubscriberStatGrid
          items={[
            {
              label: "First goal",
              value: "Choose your starting lane",
              detail:
                "Move quickly into stocks, IPOs, trading, portfolio, or learning without hunting through the full route map first.",
            },
            {
              label: "Second goal",
              value: "Enable habit loops",
              detail:
                "Alerts, inbox, portfolio, and saved workflows are easiest to adopt when they connect early in your first session.",
            },
            {
              label: "Third goal",
              value: "Reduce churn early",
              detail: "A clear setup flow makes the first session feel intentional and makes it easier to return with confidence.",
            },
          ]}
        />

        <SubscriberRecordGridSection
          title="Setup flow"
          items={accountSetupItems.map((item) => ({
            id: item.title,
            title: item.title,
            badges: [{ label: truth.usesPreviewMode ? "Preview" : item.status }],
            note: item.note,
          }))}
        />

        <SubscriberAuditSection
          title="Subscriber activation packet"
          description="This setup route now exposes the same activation packet used by launch ops, so the first-session handoff can be checked against real subscriber activation truth instead of only guided setup copy."
          headline={`${activationPacket.total} activation checkpoints with ${activationPacket.needsConfig} config blockers and ${activationPacket.needsVerification} verification lanes`}
          downloadHref="/api/subscriber-activation-packet"
          downloadLabel="Download activation packet CSV"
          stats={[
            { label: "Total checkpoints", value: activationPacket.total },
            { label: "Needs config", value: activationPacket.needsConfig },
            { label: "Needs verification", value: activationPacket.needsVerification },
            { label: "Ready", value: activationPacket.ready },
          ]}
        />

        <SubscriberRouteLinkGrid
          items={[
            {
              href: "/account/inbox",
              title: "Open inbox",
              note: "Review the current action queue after the first-session setup framing is clear.",
            },
            {
              href: "/account/alerts",
              title: "Open alert preferences",
              note: "Tighten signal intensity and channel choices right after onboarding intent is set.",
            },
            {
              href: "/portfolio",
              title: "Open portfolio",
              note: "Move from subscriber setup into the strongest retention workflow once the basics are in place.",
            },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Fast-start actions</h2>
          <div className="mt-5">
            <SubscriberRouteLinkGrid
              items={[
                {
                  title: "Open watchlists",
                  href: "/account/watchlists",
                  note: "Start building a repeatable market habit around the names you track most.",
                },
                {
                  title: "Set alert preferences",
                  href: "/account/alerts",
                  note: "Choose where portfolio, IPO, and market notifications reach you first.",
                },
                {
                  title: "Review broker options",
                  href: "/account/brokers",
                  note: "See the official connection path before you rely on portfolio sync as a workflow.",
                },
                {
                  title: "Open saved screens",
                  href: "/account/screens",
                  note: "Move from discovery into repeatable screening and alert-driven workflows.",
                },
              ]}
            />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
