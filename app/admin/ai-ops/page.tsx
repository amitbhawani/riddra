import type { Metadata } from "next";
import Link from "next/link";

import { AiAnswerPacketCreatePanel } from "@/components/ai-answer-packet-create-panel";
import { AiAnswerPacketManagePanel } from "@/components/ai-answer-packet-manage-panel";
import { AiAnswerPacketUpdatePanel } from "@/components/ai-answer-packet-update-panel";
import { AiGenerationRunCreatePanel } from "@/components/ai-generation-run-create-panel";
import { AiGenerationRunManagePanel } from "@/components/ai-generation-run-manage-panel";
import { AiGenerationRunUpdatePanel } from "@/components/ai-generation-run-update-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { getAiGenerationMemory } from "@/lib/ai-generation-memory-store";
import { getAiGenerationRegistrySummary } from "@/lib/ai-generation-registry";
import { requireUser } from "@/lib/auth";
import {
  aiCostRules,
  aiModeCards,
  aiToggleCards,
  aiWorkflowCards,
  notificationOpsCards,
  placeholderBrandRules,
} from "@/lib/ai-ops";
import { env, hasOpenAiEnv, isRealAiEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "AI Ops",
  description: "Protected planning surface for AI workflows, notification triggers, and future search-native assistance.",
};

export const dynamic = "force-dynamic";

export default async function AdminAiOpsPage() {
  await requireUser();
  const [aiMemory, aiRegistrySummary] = await Promise.all([
    getAiGenerationMemory(),
    getAiGenerationRegistrySummary(),
  ]);

  const controlState = [
    {
      label: "Default operating mode",
      value: env.aiDefaultMode.replaceAll("_", " "),
    },
    {
      label: "Real AI calls enabled",
      value: isRealAiEnabled() ? "Yes" : "No",
    },
    {
      label: "Provider key present",
      value: hasOpenAiEnv() ? "Configured" : "Missing",
    },
    {
      label: "Budget profile",
      value: env.aiBudgetProfile,
    },
  ];
  const persistenceState = [
    { label: "Retrieval datasets", value: String(aiMemory.summary.retrievalDatasets) },
    { label: "Ready datasets", value: String(aiMemory.summary.readyDatasets) },
    { label: "Stored runs", value: String(aiMemory.summary.storedRuns) },
    { label: "Stored packets", value: String(aiMemory.summary.storedAnswerPackets) },
    { label: "Live-blocked packets", value: String(aiMemory.summary.liveBlockedPackets) },
    { label: "Grounded route targets", value: String(aiMemory.summary.groundedRouteTargets) },
  ];
  const readinessItems = [
    {
      label: "Real AI calls master switch",
      status: hasOpenAiEnv() ? (isRealAiEnabled() ? "Ready" : "Needs verification") : "Needs activation",
      detail:
        "Formula-first mode stays safe by default, but the master switch still needs live-provider proof before subscriber or operator-facing generation can be trusted at launch.",
      routeTarget: "/admin/ai-ops",
    },
    {
      label: "Provider credential posture",
      status: hasOpenAiEnv() ? "Ready" : "Needs activation",
      detail:
        "AI workflows only move beyond preview memory when the upstream provider key is present and operator-approved for live requests.",
      routeTarget: "/admin/api-access",
    },
    ...aiWorkflowCards.map((card) => ({
      label: card.title,
      status:
        card.status === "Now"
          ? "Ready"
          : card.status === "Next"
            ? "Needs verification"
            : "Needs activation",
      detail: card.summary,
      routeTarget:
        card.title === "Portfolio import validator"
          ? "/portfolio/import"
          : card.title === "Smart result search"
            ? "/search"
            : card.title === "Alert summarizer"
              ? "/admin/delivery-layers"
              : "/admin/content",
    })),
    ...notificationOpsCards.map((card) => ({
      label: `${card.channel} notification lane`,
      status:
        card.channel === "Email" || card.channel === "WhatsApp"
          ? "Needs verification"
          : "Needs activation",
      detail: `${card.trigger}. ${card.purpose}`,
      routeTarget: card.channel === "Push notifications" ? "/admin/push-readiness" : "/admin/delivery-layers",
    })),
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>AI and engagement</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            AI operations
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This protected route turns your AI and communication ideas into a low-cost operating model: formula-first by default, optional live AI behind admin controls, and human-reviewed workflows where real AI adds value.
          </p>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="ai operations lane"
            panelTitle="Write-through AI-ops action"
            panelDescription="Log operator-level AI, workflow, and notification changes into the shared revision lane so AI posture stops living only as a planning and memory console."
            defaultRouteTarget="/admin/ai-ops"
            defaultOperator="AI Operations Owner"
            defaultChangedFields="ai_mode, workflow_state, delivery_posture"
            actionNoun="ai-ops mutation"
          />
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">AI control state</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-4">
            {controlState.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-mist/62">{item.label}</p>
                <p className="mt-3 text-lg font-semibold text-white capitalize">{item.value}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted AI memory lane</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Registry rows</p>
              <p className="mt-3 text-lg font-semibold text-white">{aiRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Datasets</p>
              <p className="mt-3 text-lg font-semibold text-white">{aiRegistrySummary.datasets}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Runs</p>
              <p className="mt-3 text-lg font-semibold text-white">{aiRegistrySummary.runs}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Packets</p>
              <p className="mt-3 text-lg font-semibold text-white">{aiRegistrySummary.packets}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Needs live provider</p>
              <p className="mt-3 text-lg font-semibold text-white">{aiRegistrySummary.needsLiveProvider}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {persistenceState.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-mist/62">{item.label}</p>
                <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/ai-generation-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download AI registry CSV
            </Link>
            <Link
              href="/admin/knowledge-ops"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open knowledge ops
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {aiMemory.rules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Low-cost AI operating modes</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {aiModeCards.map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/8 bg-black/15 px-5 py-5">
                <p className="text-xs uppercase tracking-[0.18em] text-flare">{card.mode}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist/74">{card.summary}</p>
                <div className="mt-4 grid gap-2">
                  {card.fit.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-mist/76">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {aiWorkflowCards.map((card) => (
            <GlowCard key={card.title}>
              <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                {card.status}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{card.summary}</p>
              <div className="mt-5 grid gap-3">
                {card.outputs.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                    {item}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Grounded retrieval datasets</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {aiMemory.datasets.map((dataset) => (
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
                <p className="mt-4 text-sm leading-7 text-mist/74">{dataset.note}</p>
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
                <p className="mt-4 text-sm leading-7 text-mist/76">{dataset.groundingUse}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted generation runs</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {aiMemory.generationRuns.map((run) => (
              <div key={run.id} className="rounded-3xl border border-white/8 bg-black/15 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-flare">{run.mode}</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{run.workflow}</h3>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {run.answerState}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Route target</p>
                    <p className="mt-2 text-sm font-medium text-white">{run.routeTarget}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Grounding source</p>
                    <p className="mt-2 text-sm font-medium text-white">{run.groundingSource}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Cost band</p>
                    <p className="mt-2 text-sm font-medium text-white">{run.costBand}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-mist/68">Stored {run.storedAt}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{run.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <AiGenerationRunCreatePanel />
          <AiGenerationRunUpdatePanel
            items={aiMemory.generationRuns.map((item) => ({
              workflow: item.workflow,
              answerState: item.answerState,
              groundingSource: item.groundingSource,
              routeTarget: item.routeTarget,
              costBand: item.costBand,
              note: item.note,
            }))}
          />
          <AiGenerationRunManagePanel
            items={aiMemory.generationRuns.map((item) => ({
              workflow: item.workflow,
              mode: item.mode,
              answerState: item.answerState,
            }))}
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stored answer packets</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {aiMemory.answerPackets.map((packet) => (
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
                <p className="mt-4 text-sm text-mist/68">Target {packet.routeTarget}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{packet.answerShape}</p>
                <p className="mt-3 text-sm text-mist/68">Grounding {packet.groundingSources}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{packet.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <AiAnswerPacketCreatePanel />
          <AiAnswerPacketUpdatePanel
            items={aiMemory.answerPackets.map((item) => ({
              workflow: item.workflow,
              audience: item.audience,
              routeTarget: item.routeTarget,
              continuityState: item.continuityState,
              groundingSources: item.groundingSources,
              answerShape: item.answerShape,
              note: item.note,
            }))}
          />
          <AiAnswerPacketManagePanel
            items={aiMemory.answerPackets.map((item) => ({
              workflow: item.workflow,
              audience: item.audience,
              continuityState: item.continuityState,
            }))}
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Admin toggle model</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {aiToggleCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-white">{card.title}</p>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/72">
                    Default {card.defaultState}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/76">{card.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Cost-control rules</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {aiCostRules.map((rule) => (
              <div key={rule.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm font-medium text-white">{rule.title}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{rule.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Notification engine readiness</h2>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {notificationOpsCards.map((card) => (
              <div key={`${card.channel}-${card.trigger}`} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm font-medium text-white">{card.channel}</p>
                <p className="mt-2 text-sm text-mist/68">{card.trigger}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{card.purpose}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Temporary-brand safety rule</h2>
          <div className="mt-5 grid gap-3">
            {placeholderBrandRules.map((rule) => (
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
