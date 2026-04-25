import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntityNewsSection } from "@/components/entity-news-section";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { ContentSectionList } from "@/components/content-section-list";
import { CoverageScoreCard } from "@/components/coverage-score-card";
import { DocumentListCard } from "@/components/document-list-card";
import { EditorialGuidanceCard } from "@/components/editorial-guidance-card";
import { FaqListCard } from "@/components/faq-list-card";
import { JsonLd } from "@/components/json-ld";
import { ManagedPageSidebarCard } from "@/components/managed-page-sidebar-card";
import { SourceTrustCard } from "@/components/source-trust-card";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard } from "@/components/ui";
import { auditCoverage } from "@/lib/content-audit";
import { getContentSections } from "@/lib/content-sections";
import { getIpo, getIpos } from "@/lib/content";
import { getEditorialGuidance } from "@/lib/editorial";
import { getIpoRedirectTarget } from "@/lib/ipo-lifecycle";
import { getLatestMarketNewsForEntity } from "@/lib/market-news/queries";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSourceByCode } from "@/lib/source-registry";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const ipos = await getIpos();
  return ipos.map((ipo) => ({ slug: ipo.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ipo = await getIpo(slug);

  if (!ipo) {
    return { title: "IPO not found" };
  }

  return {
    title: `${ipo.name}`,
    description: `${ipo.name} page template for IPO timelines, GMP, allotment, and listing coverage.`,
  };
}

export default async function IpoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const redirectTarget = await getIpoRedirectTarget(slug);

  if (redirectTarget) {
    permanentRedirect(redirectTarget);
  }

  const [ipo, sections] = await Promise.all([getIpo(slug), getContentSections("ipo", slug)]);

  if (!ipo) {
    notFound();
  }

  const source = await getSourceByCode(ipo.primarySourceCode);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const coverage = auditCoverage({
    assetType: "ipo",
    hasSummary: Boolean(ipo.summary),
    hasSnapshot: true,
    sections,
    source,
  });
  const guidance = getEditorialGuidance(coverage);
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "IPO Hub", href: "/ipo" },
    { name: ipo.name, href: `/ipo/${ipo.slug}` },
  ];

  const snapshotCards = [
    { label: "IPO type", value: ipo.ipoType },
    { label: "Status", value: ipo.status },
    { label: "Price band", value: ipo.priceBand },
    { label: "Issue size", value: ipo.issueSize },
    { label: "Lot size", value: ipo.lotSize },
    { label: "Min investment", value: ipo.minInvestment },
    { label: "Grey market premium", value: ipo.gmp },
    { label: "Expected listing", value: ipo.expectedListingPrice },
  ];

  const timeline = [
    ["Open date", ipo.openDate],
    ["Allotment", ipo.allotmentDate],
    ["Refunds", ipo.refundDate],
    ["Demat credit", ipo.dematCreditDate],
    ["Listing date", ipo.listingDate],
  ];
  const trackerLanes = [
    "Mainboard versus SME positioning stays obvious from the first fold.",
    "Subscription momentum needs day-by-day context instead of a single final oversubscription number.",
    "Registrar, allotment, refund, and listing checks stay task-oriented instead of buried in generic FAQs.",
  ];
  const listingReadiness = [
    { label: "Demand signal", value: "Blend GMP, subscription quality, and anchor appetite rather than over-reading any one indicator." },
    { label: "Allotment prep", value: "Keep registrar links, PAN / application checks, and timeline prompts close to the issue page." },
    { label: "Listing cutover", value: "Once listed, this IPO route should permanently redirect into the stock page so the long-term destination stays singular." },
  ];
  const marketNews = await getLatestMarketNewsForEntity({
    entityType: "ipo",
    entitySlug: ipo.slug,
    allowIpoCategoryFallback: true,
    allowLatestFallback: true,
    limit: 5,
  }).catch(() => ({
    articles: [],
    matchedEntityType: null,
    usedSectorFallback: false,
    usedEntityFallback: false,
    usedKeywordFallback: false,
    usedIpoFallback: false,
    usedLatestFallback: false,
  }));
  const marketNewsDescription = marketNews.usedIpoFallback
    ? "Direct IPO-linked articles are not available yet, so this section is showing the latest IPO-market stories from the broader Riddra news surface."
    : marketNews.usedLatestFallback
      ? "Direct IPO-linked articles are not available yet, so this section is showing the latest market stories from the broader Riddra news surface."
      : "Latest matched market news for this IPO with direct links into the full Market News archive.";

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: ipo.name,
          description: ipo.summary,
          path: `/ipo/${ipo.slug}`,
        })}
      />
      <GlobalSidebarPageShell category="ipo" leftClassName="riddra-legacy-light-surface space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>{ipo.ipoType}</Eyebrow>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">{ipo.name}</h1>
              <p className="max-w-3xl text-base leading-8 text-mist/76">{ipo.angle}</p>
              <p className="max-w-3xl text-sm leading-7 text-mist/72">{ipo.summary}</p>
            </div>
            <GlowCard className="min-w-[220px]">
              <p className="text-sm uppercase tracking-[0.18em] text-mist/60">IPO mood</p>
              <p className="mt-3 text-3xl font-semibold text-white">{ipo.gmp}</p>
              <p className="mt-2 text-sm text-aurora">Grey market premium snapshot</p>
            </GlowCard>
          </div>
        </div>

        <SubscriberTruthNotice
          eyebrow="IPO detail truth"
          title="This IPO detail route is useful for event tracking right now, but saved continuity still depends on launch activation"
          description={`Use ${ipo.name} confidently for public issue tracking, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity
              ? `Signed-in continuity is active enough to carry ${ipo.name} tracking into account and workspace flows.`
              : `Local preview auth still limits how trustworthy the full ${ipo.name} tracking-to-account handoff can be.`,
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium IPO workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium IPO promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for IPO users who convert from issue tracking into assisted workflows."
              : "Support delivery is still not fully active, so IPO-detail support expectations should stay conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

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
              {config.supportEmail || config.billingSupportEmail || "Not configured yet"}
            </p>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              IPO-detail tracking is now framed against the real support and continuity posture instead of a cleaner event-only shell.
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshotCards.map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <EntityNewsSection
          entityType="ipo"
          entitySlug={ipo.slug}
          articles={marketNews.articles}
          usedLatestFallback={marketNews.usedLatestFallback}
          titleOverride="Latest IPO news"
          descriptionOverride={marketNewsDescription}
        />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <GlowCard>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">IPO timeline</h2>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  Track every stage
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {timeline.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <span className="text-sm text-mist/70">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Issue breakup</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {ipo.issueBreakup.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Why investors are watching this IPO</h2>
              <div className="mt-5 grid gap-3">
                {ipo.keyPoints.map((point) => (
                  <div key={point} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/78">
                    {point}
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">Subscription watch</h2>
                <div className="rounded-full bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky">
                  Issue demand
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {ipo.subscriptionWatch.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/68">{item.note}</p>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Objects of the issue</h2>
              <div className="mt-5 grid gap-3">
                {ipo.issueObjectives.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {item}
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>

          <div className="space-y-6">
            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Company snapshot</h2>
              <div className="mt-5 grid gap-3">
                {ipo.companyDetails.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <span className="text-sm text-mist/68">{item.label}</span>
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Issue partners</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Registrar</p>
                  <p className="mt-2 text-base font-semibold text-white">{ipo.registrar}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Lead managers</p>
                  <p className="mt-2 text-base font-semibold text-white">{ipo.leadManagers.join(", ")}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Market maker</p>
                  <p className="mt-2 text-base font-semibold text-white">{ipo.marketMaker}</p>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">IPO tracker lanes</h2>
              <div className="grid gap-3">
                {trackerLanes.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/78">
                    {item}
                  </div>
                ))}
              </div>
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/72">
                Once this company officially lists, the lifecycle system turns this IPO route into a permanent redirect and hands users over to the stock route family.
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Listing readiness</h2>
              <div className="mt-5 grid gap-3">
                {listingReadiness.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-sm leading-7 text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Allotment checklist</h2>
              <div className="mt-5 grid gap-3">
                {ipo.allotmentChecklist.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {item}
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Listing watch</h2>
              <div className="mt-5 grid gap-3">
                {ipo.listingWatch.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Strengths and risks</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-aurora">Strengths</p>
                  <div className="mt-3 grid gap-3">
                    {ipo.strengths.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-flare">Risks</p>
                  <div className="mt-3 grid gap-3">
                    {ipo.risks.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>

            <DocumentListCard items={ipo.documents} title="Documents and references" />
            <FaqListCard items={ipo.faqItems} title="IPO FAQs" />
            <ContentSectionList
              emptyMessage="Add structured IPO content sections in Supabase to make this lifecycle route richer and more searchable."
              sections={sections}
            />
            <ManagedPageSidebarCard family="ipo" assetName={ipo.name} />
            <SourceTrustCard contextLabel="IPO page" source={source} />
            <CoverageScoreCard audit={coverage} />
            <EditorialGuidanceCard guidance={guidance} />
          </div>
        </div>
      </GlobalSidebarPageShell>
    </>
  );
}
