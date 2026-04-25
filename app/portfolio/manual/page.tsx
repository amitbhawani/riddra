import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PortfolioManualBuilderPanel } from "@/components/portfolio-manual-builder-panel";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { manualPortfolioFields } from "@/lib/portfolio";
import { getPortfolioMemory } from "@/lib/portfolio-memory-store";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Manual Portfolio Builder",
  description: "Riddra manual portfolio creation flow for Google Finance-style self-managed portfolios.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioManualPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const portfolioMemory = await getPortfolioMemory(user);
  const usesDurablePortfolioState = portfolioMemory.storageMode === "supabase_private_beta";
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Manual Builder", href: "/portfolio/manual" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Manual portfolio</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">Manual portfolio builder</h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            Add positions manually, track values quickly, and build a self-managed portfolio without waiting for broker connectivity.
          </p>
        </div>

        <SubscriberTruthNotice
          eyebrow="Manual-builder truth"
          title="Manual portfolio entry is still a protected preview flow"
          description={
            usesDurablePortfolioState
              ? "This builder shows the shape of manual portfolio creation, and the page now reads a persisted draft from the shared private-beta portfolio lane for the signed-in account. Real user ownership and live valuation continuity still need more verification before it can be presented as a fully live subscriber tool."
              : "This builder still falls back to the file-backed portfolio draft for the signed-in account because durable private-beta portfolio storage is unavailable."
          }
          items={[
            truth.hasBrokerContinuity
              ? "Broker continuity exists enough to compare manual and connected paths more rigorously."
              : "Manual entry remains the safest planning path while broker continuity is still staged.",
            truth.hasMarketDataProvider
              ? "A market-data source is available, so the next step is binding manual holdings to verified delayed valuation."
              : "Manual holdings still need a live valuation source before this flow can be trusted as a live portfolio tool.",
            `Current persisted draft: ${portfolioMemory.manualDraft.symbol} · ${portfolioMemory.manualDraft.quantity} shares @ ${portfolioMemory.manualDraft.avgCost}.`,
            `Storage mode: ${portfolioMemory.storageMode.replaceAll("_", " ")}.`,
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Entry flow</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            The builder still runs as a preview tool, but the signed-in account now carries a persisted draft posture in the portfolio memory store: {portfolioMemory.manualDraft.draftState}. Saving below now updates {usesDurablePortfolioState ? "the shared private-beta portfolio lane" : "the fallback portfolio draft file"} instead of only changing local component state.
          </p>
          <div className="mt-5">
            <PortfolioManualBuilderPanel fields={manualPortfolioFields} initialDraft={portfolioMemory.manualDraft} />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
