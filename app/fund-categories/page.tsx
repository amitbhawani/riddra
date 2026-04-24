import type { Metadata } from "next";
import Link from "next/link";

import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getFundCategoryHubs } from "@/lib/hubs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Fund Categories",
  description: "Mutual fund category hubs for grouped discovery and research.",
};

export default async function FundCategoriesPage() {
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const categories = await getFundCategoryHubs();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Cluster authority</Eyebrow>
          <SectionHeading
            title="Mutual fund category hubs"
            description="Category hubs make the fund experience easier to understand and give Riddra a stronger long-tail discovery structure."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Fund-category truth"
          title="These category hubs are strong for grouped discovery, but deeper continuity still depends on launch activation"
          description="Use category hubs confidently for public fund discovery, while keeping auth continuity, premium follow-through, and support recovery honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry category discovery into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full fund-category-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium fund-workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for public fund users who convert."
              : "Support delivery is still not fully active, so fund-category hubs should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Category coverage</p>
            <p className="mt-2 text-3xl font-semibold text-white">{categories.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              {supportRegistry.inProgress} in progress, {supportRegistry.blocked} blocked.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support email</p>
            <p className="mt-2 text-base font-semibold text-white">
              {config.supportEmail || config.billingSupportEmail || "Not configured yet"}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {categories.map((category) => (
            <Link key={category.slug} href={`/fund-categories/${category.slug}`}>
              <GlowCard className="h-full transition hover:border-aurora/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{category.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{category.description}</p>
                  </div>
                  <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                    {category.itemCount} funds
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
