import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { gettingStartedPaths } from "@/lib/get-started";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Riddra onboarding hub for first-time visitors, signups, and early subscribers.",
};

export default function GetStartedPage() {
  const config = getRuntimeLaunchConfig();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Get Started", href: "/get-started" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Get Started",
          description: "Riddra onboarding hub for first-time visitors, signups, and early subscribers.",
          path: "/get-started",
        })}
      />
      <GlobalSidebarPageShell category="home">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Launch onboarding</Eyebrow>
          <SectionHeading
            title="Get started with Riddra"
            description="Choose the clearest starting path based on what you want to do first, without being forced into a heavy signup flow."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Onboarding truth"
          title="This onboarding hub is useful now, but the full subscriber journey still depends on launch activation"
          description="Use this page to guide first-time users into the clearest path, while keeping auth continuity, billing activation, and support delivery honest."
          authReady="Signed-in continuity is active enough to hand users from public exploration into account setup."
          authPending="Local preview auth still limits how trustworthy the full public-to-account handoff can be."
          billingReady="Billing core credentials exist, so plan and upgrade language can move beyond pure preview framing once checkout is exercised."
          billingPending="Billing credentials are still incomplete, so paid-plan messaging should stay expectation-setting."
          supportReady="Support delivery is configured enough to start testing real onboarding and recovery follow-up."
          supportPending="Support delivery is still not fully active, so onboarding should keep fallback support expectations conservative."
          href="/signup"
          hrefLabel="Open signup"
          stats={[
            {
              label: "Principle",
              value: "Useful first",
              detail:
                "Start with useful actions first, then sign up when you want to save progress and keep continuity.",
            },
            {
              label: "Launch goal",
              value: "Reduce confusion",
              detail:
                "A broad fintech platform can feel overwhelming unless we show clean starting paths right away.",
            },
            {
              label: "Conversion logic",
              value: "Natural next step",
              detail:
                "Signup is the natural next step to save progress, unlock alerts, and build a personal workspace.",
            },
            {
              label: "Support continuity",
              value: `${supportRegistry.total} rows`,
              detail: `${supportRegistry.inProgress} in progress, ${supportRegistry.blocked} blocked, and contact email currently ${config.supportEmail ? "configured" : "not configured yet"}.`,
            },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {gettingStartedPaths.map((path) => (
            <GlowCard key={path.title}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">{path.title}</h2>
                <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  {path.audience}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/74">{path.summary}</p>
              <Link
                href={path.href}
                className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open page
              </Link>
            </GlowCard>
          ))}
        </div>
      </GlobalSidebarPageShell>
    </div>
  );
}
