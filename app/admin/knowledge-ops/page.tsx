import type { Metadata } from "next";

import { AiDatasetCreatePanel } from "@/components/ai-dataset-create-panel";
import { AiDatasetManagePanel } from "@/components/ai-dataset-manage-panel";
import { AiDatasetUpdatePanel } from "@/components/ai-dataset-update-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getAiGenerationMemory } from "@/lib/ai-generation-memory-store";
import { requireUser } from "@/lib/auth";
import { knowledgeOpsRules, knowledgeSourceSamples } from "@/lib/knowledge-ops";

export const metadata: Metadata = {
  title: "Knowledge Ops",
  description: "Protected knowledge-ops page for retrieval inputs, AI grounding sources, and smart-search pipeline planning.",
};

export const dynamic = "force-dynamic";

export default async function KnowledgeOpsPage() {
  await requireUser();
  const aiMemory = await getAiGenerationMemory();
  const pendingPipelines = aiMemory.datasets.filter((dataset) => dataset.status !== "Ready").length;
  const readinessItems = [
    ...knowledgeSourceSamples.map((item) => ({
      label: item.source,
      status:
        item.status === "Ready"
          ? "Ready"
          : item.status === "In progress"
            ? "Needs verification"
            : "Needs activation",
      detail: item.note,
      routeTarget:
        item.source === "editorial_blocks"
          ? "/admin/block-editor"
          : item.source === "asset_documents"
            ? "/admin/documents"
            : item.source === "asset_announcements"
              ? "/admin/announcements"
              : item.source === "asset_relationships"
                ? "/admin/relationships"
                : "/admin/source-entry-console",
    })),
    {
      label: "Stored answer packet continuity",
      status: aiMemory.answerPackets.length > 0 ? "Needs verification" : "Needs activation",
      detail:
        aiMemory.answerPackets.length > 0
          ? `There are ${aiMemory.answerPackets.length} persisted answer packets, but they still need live provider and retrieval proof before launch-time trust is complete.`
          : "No answer-packet continuity has been stored yet, so grounded handoffs still need to move past planning-only posture.",
      routeTarget: "/admin/knowledge-ops",
    },
  ];

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Knowledge Ops", href: "/admin/knowledge-ops" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>AI and search backend</Eyebrow>
          <SectionHeading
            title="Knowledge operations"
            description="This page tracks how editorial content, documents, announcements, relationships, and source snapshots should become grounded inputs for smart search and future AI features."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Retrieval sources</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.retrievalDatasets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Structured feeds</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.readyDatasets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending pipelines</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingPipelines}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Stored answer packets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.answerPackets.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Grounded route targets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.groundedRouteTargets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Live-blocked packets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiMemory.summary.liveBlockedPackets}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="knowledge operations lane"
            panelTitle="Write-through knowledge-ops action"
            panelDescription="Log grounding-source and retrieval-pipeline changes into the shared revision lane so knowledge posture stops living only as a retrieval-memory console."
            defaultRouteTarget="/admin/knowledge-ops"
            defaultOperator="Knowledge Operations Owner"
            defaultChangedFields="grounding_source, retrieval_state, answer_continuity"
            actionNoun="knowledge-ops mutation"
          />
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted retrieval datasets</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {aiMemory.datasets.map((dataset) => (
              <div key={dataset.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{dataset.source}</h3>
                    <p className="mt-2 text-sm text-mist/66">{dataset.role}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {dataset.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Retained chunks</p>
                    <p className="mt-2 text-lg font-semibold text-white">{dataset.retainedChunks}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Route targets</p>
                    <p className="mt-2 text-lg font-semibold text-white">{dataset.routeTargets}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Freshness</p>
                    <p className="mt-2 text-sm font-medium text-white">{dataset.freshness}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{dataset.groundingUse}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <AiDatasetCreatePanel />
          <AiDatasetUpdatePanel
            items={aiMemory.datasets.map((item) => ({
              source: item.source,
              status: item.status,
              retainedChunks: item.retainedChunks,
              routeTargets: item.routeTargets,
              freshness: item.freshness,
              groundingUse: item.groundingUse,
              note: item.note,
            }))}
          />
          <AiDatasetManagePanel
            items={aiMemory.datasets.map((item) => ({
              source: item.source,
              role: item.role,
              status: item.status,
            }))}
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Knowledge sources</h2>
          <div className="mt-5 grid gap-4">
            {knowledgeSourceSamples.map((item) => (
              <div key={item.source} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.source}</h3>
                    <p className="mt-2 text-sm text-mist/66">{item.role}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stored answer packet continuity</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {aiMemory.answerPackets.map((packet) => (
              <div key={packet.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{packet.workflow}</h3>
                    <p className="mt-2 text-sm text-mist/66">{packet.audience}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {packet.continuityState}
                  </span>
                </div>
                <p className="mt-3 text-sm text-mist/68">Target {packet.routeTarget}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{packet.note}</p>
                <p className="mt-3 text-sm text-mist/66">Grounding {packet.groundingSources}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Grounding rules</h2>
          <div className="mt-5 grid gap-3">
            {knowledgeOpsRules.map((rule) => (
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
