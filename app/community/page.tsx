import type { Metadata } from "next";
import Link from "next/link";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ProductPageContainer, ProductPageTwoColumnLayout } from "@/components/product-page-system";
import { Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { mentorshipLadderStages } from "@/lib/mentorship-ladders";
import {
  communityProgramsItems,
  communityProgramsRules,
  communityProgramsSummary,
} from "@/lib/community-programs";

export const metadata: Metadata = {
  title: "Community Programs",
  description: "Riddra community-programs view for guided participation, mentorship ladders, and deeper subscriber learning loops.",
};

export default async function CommunityPage() {
  const sidebar = await getGlobalSidebarRail("community");
  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="riddra-legacy-light-surface space-y-6">
              <div className="space-y-5">
                <Eyebrow>Community layer</Eyebrow>
                <SectionHeading
                  title="Community programs"
                  description="Explore community programs, office hours, and guided participation paths that extend learning beyond standalone content."
                />
              </div>

        <PublicSurfaceTruthSection
          eyebrow="Community truth"
          title="This community layer is structurally strong, but deeper participation continuity still depends on launch activation"
          description="Use community programs confidently for public guidance, while keeping auth continuity, premium participation promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry community participation into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full community-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium participation and mentorship language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for users who convert through community flows."
          supportPending="Support delivery is still not fully active, so the community layer should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          stats={[
            {
              label: "Program families",
              value: communityProgramsSummary.programFamilies,
            },
            {
              label: "Engagement loops",
              value: communityProgramsSummary.engagementLoops,
            },
            {
              label: "Support bridges",
              value: communityProgramsSummary.supportBridges,
            },
            {
              label: "Support continuity",
              value: "Participation-safe posture",
              detail:
                "Community programs now read against the same support, account, and launch posture as the rest of the public product.",
            },
          ]}
        />

        <div className="grid gap-6">
          {communityProgramsItems.map((item) => (
            <Link key={item.slug} href={`/community/${item.slug}`}>
              <GlowCard className="h-full transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-3 text-sm text-mist/66">{item.participationMode}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.status}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                    {item.rhythm}
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                    {item.loops.length} continuity loops
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {mentorshipLadderStages.slice(2).map((stage) => (
            <GlowCard key={stage.stage}>
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{stage.audience}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{stage.stage}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{stage.path}</p>
              <p className="mt-3 text-sm leading-7 text-mist/66">{stage.goal}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Community rules</h2>
          <div className="mt-5 grid gap-3">
            {communityProgramsRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
