import type { Metadata } from "next";

import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { MarketCopilotWorkspace } from "@/components/market-copilot-workspace";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getAiGenerationMemory } from "@/lib/ai-generation-memory-store";
import {
  marketCopilotPanels,
  marketCopilotPlaybooks,
  marketCopilotRules,
  marketCopilotSummary,
} from "@/lib/market-copilot";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export const metadata: Metadata = {
  title: "Market Copilot",
  description: "Formula-first market copilot for grounded explanations across index, IPO, and fund workflows.",
};

export const dynamic = "force-dynamic";

export default async function MarketCopilotPage() {
  const config = getRuntimeLaunchConfig();
  const aiMemory = await getAiGenerationMemory();
  const placeholderTruth = getPlaceholderHonestyRowByHref("/market-copilot");
  const hasLiveAiProvider = Boolean(config.openAiApiKey || config.aiGatewayUrl);
  const copilotPackets = aiMemory.answerPackets.slice(0, 4);
  const copilotDatasets = aiMemory.datasets.filter((dataset) =>
    ["editorial_blocks", "asset_announcements", "asset_relationships", "source_snapshots"].includes(dataset.source),
  );

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>AI-ready layer</Eyebrow>
          <SectionHeading
            title="Market copilot"
            description="Use the explanation layer that starts with formula-first and retrieval-first answers, then brings in optional AI only when it genuinely improves the result."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Copilot truth"
          title="This route is a guided preview, not a live AI copilot yet"
          description="Market Copilot is useful today as a formula-first explainer and route-handoff layer, but it should not be mistaken for a fully activated AI assistant with live provider continuity, saved threads, or subscriber memory."
          items={[
            hasLiveAiProvider
              ? "AI provider settings exist, but this route still defaults to the grounded formula-first layer rather than an always-on generated answer."
              : "No live AI provider is configured right now, so the route should be treated as a guided preview and handoff surface instead of a live assistant.",
            "The strongest value today is the playbook, checks-first reasoning, and next-route handoff into stronger product pages.",
            "A first file-backed grounded-answer memory lane now exists for retrieval datasets and reusable answer packets, but it still is not the same thing as live chat continuity or saved subscriber threads.",
          ]}
          currentState={placeholderTruth?.currentState}
          expectedState={placeholderTruth?.expectedState}
          href="/admin/public-launch-qa"
          hrefLabel="Open public launch QA"
          secondaryHref="/admin/ai-ops"
          secondaryHrefLabel="Open AI ops"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Answer mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketCopilotSummary.answerMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Live AI default</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketCopilotSummary.liveAiDefault}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Grounded sources</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketCopilotSummary.groundedSources}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active playbooks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketCopilotSummary.activePlaybooks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Route handoffs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketCopilotSummary.routeHandoffs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Retrieval datasets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.retrievalDatasets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Stored answer packets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.storedAnswerPackets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Live-blocked packets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.liveBlockedPackets}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {marketCopilotPanels.map((panel) => (
            <GlowCard key={panel.title}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">{panel.title}</h2>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {panel.status}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/74">{panel.summary}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Formula-first workspace</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-mist/74">
            This route now behaves more like a usable copilot desk than an architecture note. Pick a playbook, review
            what the system checks first, and jump into the strongest next route without waiting for live AI to be
            enabled.
          </p>
          <div className="mt-6">
            <MarketCopilotWorkspace playbooks={marketCopilotPlaybooks} />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Grounded answer packet memory</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-mist/74">
            These persisted packets are the first backend step toward a real copilot memory lane. They keep grounded
            route targets, source-state posture, and reusable answer shapes together instead of treating every response
            like an unsaved chat draft.
          </p>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {copilotPackets.map((packet) => (
              <div key={packet.id} className="rounded-3xl border border-white/8 bg-black/15 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-flare">{packet.audience}</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{packet.workflow}</h3>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {packet.continuityState}
                  </div>
                </div>
                <p className="mt-4 text-sm text-mist/68">Route target {packet.routeTarget}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{packet.answerShape}</p>
                <p className="mt-3 text-sm text-mist/68">Grounding {packet.groundingSources}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{packet.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Retrieval backbone</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {copilotDatasets.map((dataset) => (
              <div key={dataset.id} className="rounded-3xl border border-white/8 bg-black/15 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-flare">{dataset.source}</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{dataset.role}</h3>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {dataset.status}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/74">{dataset.groundingUse}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Chunks</p>
                    <p className="mt-2 text-lg font-semibold text-white">{dataset.retainedChunks}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Routes</p>
                    <p className="mt-2 text-lg font-semibold text-white">{dataset.routeTargets}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Freshness</p>
                    <p className="mt-2 text-sm font-medium text-white">{dataset.freshness}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Copilot rules</h2>
          <div className="mt-5 grid gap-3">
            {marketCopilotRules.map((rule) => (
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
