import type { Metadata } from "next";
import Link from "next/link";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { ProductPageContainer, ProductPageTwoColumnLayout } from "@/components/product-page-system";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getStockSectorHubs } from "@/lib/hubs";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Stock Sectors",
  description: "Browse grouped stock research by sector and move faster through compare and thematic discovery paths.",
};

export default async function SectorsPage() {
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const [sectors, sidebar] = await Promise.all([getStockSectorHubs(), getGlobalSidebarRail("sectors")]);

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="riddra-legacy-light-surface space-y-6">
              <div className="space-y-5">
          <Eyebrow>Cluster authority</Eyebrow>
          <SectionHeading
            title="Stock sector hubs"
            description="Sector hubs help Riddra move from isolated stock pages into grouped market understanding, compare flows, and thematic search authority."
          />
              </div>

        <SubscriberTruthNotice
          eyebrow="Sector truth"
          title="These sector hubs are strong for grouped discovery, but deeper continuity still depends on launch activation"
          description="Use sector hubs confidently for public stock discovery, while keeping auth continuity, premium follow-through, and support recovery honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry sector discovery into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full sector-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium sector-workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for public stock users who convert through sector flows."
              : "Support delivery is still not fully active, so sector hubs should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Sector coverage</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sectors.length}</p>
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
          {sectors.map((sector) => (
            <Link key={sector.slug} href={`/sectors/${sector.slug}`}>
              <GlowCard className="h-full transition hover:border-aurora/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{sector.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{sector.description}</p>
                  </div>
                  <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                    {sector.itemCount} stocks
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
