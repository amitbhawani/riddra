import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommodityHistoryPreview } from "@/components/commodity-history-preview";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import {
  ProductCard,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { ToolCalculatorPanel } from "@/components/tool-calculator-panel";
import { Eyebrow, GlowCard } from "@/components/ui";
import { getCommodityHistory, type GoldHistoryEntry, type SilverHistoryEntry } from "@/lib/commodity-history";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getToolBySlug, tools } from "@/lib/tools";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return { title: "Tool not found" };
  }

  return {
    title: tool.title,
    description: tool.summary,
  };
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Tools", href: "/tools" },
    { name: tool.title, href: `/tools/${tool.slug}` },
  ];
  const goldHistory: GoldHistoryEntry[] | null =
    tool.slug === "gold-price-tracker" ? ((await getCommodityHistory("gold", 10)) as GoldHistoryEntry[]) : null;
  const silverHistory: SilverHistoryEntry[] | null =
    tool.slug === "silver-price-tracker"
      ? ((await getCommodityHistory("silver", 10)) as SilverHistoryEntry[])
      : null;
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  return (
    <GlobalSidebarPageShell
      category="tools"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
      <div className="space-y-5">
        <Breadcrumbs items={breadcrumbs} />
        <Eyebrow>{tool.category}</Eyebrow>
        <ProductSectionTitle title={tool.title} description={tool.summary} />
      </div>

        <SubscriberTruthNotice
          eyebrow="Tool detail truth"
          title="This tool detail route is useful right now, but saved continuity still depends on launch activation"
          description={`Use ${tool.title} confidently for public utility value, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity
              ? `Signed-in continuity is active enough to carry ${tool.title} usage into account and workspace flows.`
              : `Local preview auth still limits how trustworthy the full ${tool.title} tool-to-account handoff can be.`,
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium tool workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium tool promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for tool users who convert into assisted workflows."
              : "Support delivery is still not fully active, so tool-detail support expectations should stay conservative.",
          ]}
          href="/pricing"
          hrefLabel="Open pricing"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <ProductCard tone="secondary">
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">Support registry rows</p>
            <p className="riddra-product-number mt-2 text-3xl font-semibold text-[#1B3A6B]">{supportRegistry.total}</p>
          </ProductCard>
          <ProductCard tone="secondary">
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">In progress</p>
            <p className="riddra-product-number mt-2 text-3xl font-semibold text-[#1B3A6B]">{supportRegistry.inProgress}</p>
          </ProductCard>
          <ProductCard tone="secondary">
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">Blocked</p>
            <p className="riddra-product-number mt-2 text-3xl font-semibold text-[#1B3A6B]">{supportRegistry.blocked}</p>
          </ProductCard>
          <ProductCard tone="secondary">
            <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">Support continuity</p>
            <p className="riddra-product-body mt-2 text-base font-semibold text-[#1B3A6B]">
              {config.supportEmail || config.billingSupportEmail || "Not configured yet"}
            </p>
            <p className="riddra-product-body mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              Tool-detail usage is now framed against the real support and continuity posture instead of a cleaner utility-only shell.
            </p>
          </ProductCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { label: "Access", value: tool.access },
            { label: "Typical input", value: tool.inputLabel },
            { label: "Outcome", value: tool.outcome },
          ].map((item) => (
            <ProductCard key={item.label} tone="secondary">
              <p className="riddra-product-body text-sm text-[rgba(107,114,128,0.76)]">{item.label}</p>
              <p className="riddra-product-body mt-3 text-lg font-semibold text-[#1B3A6B]">{item.value}</p>
            </ProductCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Interactive tool</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            The strongest free utilities need to work immediately, not only describe the value around them. This panel loads the live tool experience directly inside the Riddra route.
          </p>
          <div className="mt-6">
            <ToolCalculatorPanel slug={tool.slug} />
          </div>
        </GlowCard>

        {tool.slug === "gold-price-tracker" && goldHistory ? (
          <CommodityHistoryPreview tool="gold" entries={goldHistory} />
        ) : null}
        {tool.slug === "silver-price-tracker" && silverHistory ? (
          <CommodityHistoryPreview tool="silver" entries={silverHistory} />
        ) : null}

      <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Smart query flow</h2>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5">
            <p className="text-sm text-mist/66">Example query</p>
            <p className="mt-3 text-sm leading-7 text-white">{tool.samplePrompt}</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "User enters a natural-language request instead of filling a rigid form first.",
              "Riddra identifies the relevant tool, extracts inputs, and asks follow-up questions only when needed.",
              "Results can then be saved to the user account once signup or login is complete.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
      </GlowCard>
    </GlobalSidebarPageShell>
  );
}
