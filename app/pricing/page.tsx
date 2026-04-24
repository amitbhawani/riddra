import type { Metadata } from "next";
import Link from "next/link";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ButtonLink, Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { planAccessMatrix } from "@/lib/plan-access-matrix";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { pricingPlans } from "@/lib/site";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Review Riddra launch-preview pricing for Starter, Pro, and Elite workflows.",
};

export default function PricingPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const commitmentItems = getLaunchCommitmentItems();
  const authCommitment = commitmentItems.find((item) => item.title === "Auth activation posture");
  const paymentCommitment = commitmentItems.find((item) => item.title === "Payment and subscription truth");
  const supportCommitment = commitmentItems.find((item) => item.title === "Support and transactional delivery");

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Launch pricing</Eyebrow>
          <SectionHeading
            title="Simple pricing that feels believable at launch"
            description="The pricing layer should feel commercially realistic even while some workflow boundaries are still being hardened. Starter stays free, Pro serves serious market users, and Elite sits above that as the highest-touch layer."
          />
        </div>
        <PublicSurfaceTruthSection
          eyebrow="Pricing truth"
          title="This pricing page is a private-beta expectation layer, not a live checkout surface"
          description="Use pricing to explain the eventual commercial shape clearly, while keeping auth continuity, paid upgrades, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to connect public pricing decisions into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full pricing-to-account handoff can be."
          billingReady="Even if billing credentials exist, paid checkout and subscription flows remain intentionally unavailable during private beta."
          billingPending="Commercial billing is intentionally unavailable during private beta, so paid-plan promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to handle pricing and future billing questions without pretending checkout is active."
          supportPending="Support delivery is still not fully active, so pricing questions should point to visible fallback help rather than a hardened support desk."
          href="/signup"
          hrefLabel="Open signup"
          stats={[
            { label: "Support registry rows", value: supportRegistry.total },
            { label: "In progress", value: supportRegistry.inProgress },
            { label: "Blocked", value: supportRegistry.blocked },
            {
              label: "Billing support",
              value: config.billingSupportEmail || config.supportEmail || "Not configured yet",
            },
          ]}
        />
        <GlowCard className="border-aurora/40">
          <h2 className="text-2xl font-semibold text-white">Current pricing posture</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/76">
            Riddra should not look like a random pricing mockup. The current structure is intentionally closer to a believable Indian launch stack: a generous free layer, a mid-market Pro plan, and a higher-touch Elite tier.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Create account</ButtonLink>
            <ButtonLink href="/get-started" tone="secondary">
              Compare starting paths
            </ButtonLink>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {authCommitment ? (
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{authCommitment.title}</p>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
                    {authCommitment.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{authCommitment.detail}</p>
              </div>
            ) : null}
            {paymentCommitment ? (
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{paymentCommitment.title}</p>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
                    {paymentCommitment.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{paymentCommitment.detail}</p>
              </div>
            ) : null}
            {supportCommitment ? (
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{supportCommitment.title}</p>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
                    {supportCommitment.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{supportCommitment.detail}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Support registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Billing support</p>
              <p className="mt-2 text-base font-semibold text-white">
                {config.billingSupportEmail || config.supportEmail || "Not configured yet"}
              </p>
            </div>
          </div>
        </GlowCard>
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <GlowCard key={plan.name} className={plan.featured ? "border-aurora/60 bg-gradient-to-b from-aurora/10 to-white/[0.04]" : ""}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
                {plan.featured ? (
                  <span className="rounded-full bg-aurora px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                    Current focus
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-4xl font-semibold text-white">{plan.price}</p>
              <p className="mt-4 text-sm leading-7 text-mist/74">{plan.summary}</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-mist/78">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
                {plan.ctaNote}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={plan.ctaHref}>{plan.ctaLabel}</ButtonLink>
                <ButtonLink href="/contact" tone="secondary">
                  Talk to team
                </ButtonLink>
              </div>
            </GlowCard>
          ))}
        </div>
        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current access matrix</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This is the simplest honest view of how Starter, Pro, and Elite differ right now while entitlement enforcement continues tightening in the background.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left text-mist/60">
                  <th className="px-4 py-2 font-medium">Workflow</th>
                  <th className="px-4 py-2 font-medium">Starter</th>
                  <th className="px-4 py-2 font-medium">Pro</th>
                  <th className="px-4 py-2 font-medium">Elite</th>
                </tr>
              </thead>
              <tbody>
                {planAccessMatrix.map((row) => (
                  <tr key={row.workflow}>
                    <td className="rounded-l-2xl border border-white/8 bg-black/15 px-4 py-4 font-medium text-white">{row.workflow}</td>
                    <td className="border-y border-white/8 bg-black/15 px-4 py-4 text-mist/74">{row.starter}</td>
                    <td className="border-y border-white/8 bg-black/15 px-4 py-4 text-mist/74">{row.pro}</td>
                    <td className="rounded-r-2xl border border-white/8 bg-black/15 px-4 py-4 text-mist/74">{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">New to Riddra?</p>
            <p className="mt-2 text-2xl font-semibold text-white">Start with useful public flows</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Explore markets, stocks, funds, charts, and tools first. Move to a paid plan only when you need continuity, saved workflows, and deeper research support.
            </p>
            <Link
              href="/get-started"
              className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open onboarding guide
            </Link>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active trader?</p>
            <p className="mt-2 text-2xl font-semibold text-white">Choose based on workflow depth</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              If faster screening, alerts, chart context, and repeat daily use matter most, Pro is the realistic step up. Elite is for users who want the fullest layer.
            </p>
            <Link
              href="/charts"
              className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Explore chart stack
            </Link>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Need plan clarity?</p>
            <p className="mt-2 text-2xl font-semibold text-white">Use pricing as a real expectation layer</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              The plan page should now feel closer to a realistic launch expectation, even if some exact gated boundaries continue to sharpen over time.
            </p>
            <Link
              href="/launch-readiness"
              className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              See launch posture
            </Link>
          </GlowCard>
        </div>
      </Container>
    </div>
  );
}
