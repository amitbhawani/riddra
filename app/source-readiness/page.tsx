import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { chartStrategySteps, sourceReadinessItems } from "@/lib/source-readiness";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Source Readiness",
  description: "Riddra source and integration readiness tracker for market data, charts, and broker connectivity.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SourceReadinessPage() {
  await requireAdmin();

  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Source Readiness", href: "/source-readiness" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Source Readiness",
          description:
            "Riddra source and integration readiness tracker for market data, charts, and broker connectivity.",
          path: "/source-readiness",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Execution support</Eyebrow>
          <SectionHeading
            title="Source readiness"
            description="Use this page to track which data sources, access requests, and integration paths are ready now, queued next, or still waiting on activation."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Source truth"
          title="This source-readiness route is useful for activation planning, but deeper continuity still depends on launch activation"
          description="Use source readiness confidently for operator planning, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry source and integration planning into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full source-readiness handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium source and integration language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so source-readiness promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for integration-driven user flows."
              : "Support delivery is still not fully active, so source-readiness routes should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Start now</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {sourceReadinessItems.filter((item) => item.priority === "Start now").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Soon</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {sourceReadinessItems.filter((item) => item.priority === "Soon").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Backlog</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {sourceReadinessItems.filter((item) => item.priority === "Later").length}
            </p>
          </GlowCard>
        </div>

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
            <p className="mt-2 text-base font-semibold text-white">
              {config.supportEmail || "Not configured yet"}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {sourceReadinessItems.map((item) => (
            <GlowCard key={item.name}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.name}</h2>
                  <p className="mt-2 text-sm text-mist/68">
                    {item.category} • {item.priority}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                  {item.status}
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Purpose: <span className="text-white">{item.purpose}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Why it matters: <span className="text-white">{item.whyItMatters}</span>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Chart strategy</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {chartStrategySteps.map((step) => (
              <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {step}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
