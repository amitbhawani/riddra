import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { replayMemoryChains, replayMemoryRules, replayMemorySummary } from "@/lib/replay-memory";

export const metadata: Metadata = {
  title: "Replay Memory",
  description: "Protected replay-memory surface for webinar, cohort, newsletter, and archive continuity.",
};

export default async function ReplayMemoryPage() {
  await requireUser();

  const readinessItems = replayMemoryChains.map((chain) => ({
    label: chain.title,
    status: chain.status === "In progress" ? "Needs verification" : "Queued",
    detail: `${chain.source} · ${chain.continuity}`,
    routeTarget:
      chain.title === "IPO workshop replay chain"
        ? "/webinars/ipo-analysis-live/replay"
        : chain.title === "Chart bootcamp replay chain"
          ? "/webinars/chart-reading-bootcamp/replay"
          : chain.title === "Fund clinic continuity chain"
            ? "/webinars/mutual-fund-selection-clinic/replay"
            : "/community",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Replay Memory", href: "/admin/replay-memory" },
            ]}
          />
          <Eyebrow>Learning memory</Eyebrow>
          <SectionHeading
            title="Replay memory"
            description="Phase 16 should preserve how webinars, guided sessions, and newsletters turn into durable replay chains instead of ending as one-time drops."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Replay chains</p>
            <p className="mt-2 text-3xl font-semibold text-white">{replayMemorySummary.replayChains}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Distribution loops</p>
            <p className="mt-2 text-3xl font-semibold text-white">{replayMemorySummary.distributionLoops}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archive-linked assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{replayMemorySummary.archiveLinkedAssets}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="replay memory chain"
              panelTitle="Write-through replay-memory action"
              panelDescription="Log replay-chain and archive-continuity changes into the shared revision lane so replay memory stops living only as an education note."
              defaultRouteTarget="/admin/replay-memory"
              defaultOperator="Replay Memory Operator"
              defaultChangedFields="replay_chain, archive_handoff, continuity_rule"
              actionNoun="replay-memory mutation"
            />
          </GlowCard>
          {replayMemoryChains.map((chain) => (
            <GlowCard key={chain.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{chain.title}</h2>
                  <p className="mt-2 text-sm text-mist/66">{chain.source}</p>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{chain.continuity}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {chain.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Replay rules</h2>
          <div className="mt-5 grid gap-3">
            {replayMemoryRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
