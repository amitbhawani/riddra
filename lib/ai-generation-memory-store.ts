import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { aiWorkflowCards } from "@/lib/ai-ops";
import { knowledgeSourceSamples } from "@/lib/knowledge-ops";
import { marketCopilotPlaybooks } from "@/lib/market-copilot";

export type AiRetrievalDataset = {
  id: string;
  source: string;
  role: string;
  status: "Ready" | "Growing" | "Needs automation";
  retainedChunks: number;
  routeTargets: number;
  freshness: string;
  groundingUse: string;
  note: string;
};

export type AiGenerationRun = {
  id: string;
  workflow: string;
  mode: "Formula-first" | "Hybrid optional AI" | "On-demand AI";
  routeTarget: string;
  answerState: "Stored" | "Queued" | "Needs live provider";
  groundingSource: string;
  storedAt: string;
  costBand: "Lowest cost" | "Budget watch" | "Controlled spend";
  note: string;
};

export type AiAnswerPacket = {
  id: string;
  workflow: string;
  audience: string;
  routeTarget: string;
  continuityState: "Stored packet" | "Preview packet" | "Needs live provider";
  groundingSources: string;
  storedAt: string;
  answerShape: string;
  note: string;
};

export type SaveAiRetrievalDatasetInput = {
  source: string;
  status: AiRetrievalDataset["status"];
  retainedChunks: number;
  routeTargets: number;
  freshness: string;
  groundingUse: string;
  note: string;
};

export type AddAiRetrievalDatasetInput = {
  id: string;
  source: string;
  role: string;
  status: AiRetrievalDataset["status"];
  retainedChunks: number;
  routeTargets: number;
  freshness: string;
  groundingUse: string;
  note: string;
};

export type SaveAiGenerationRunInput = {
  workflow: string;
  answerState: AiGenerationRun["answerState"];
  groundingSource: string;
  routeTarget: string;
  costBand: AiGenerationRun["costBand"];
  note: string;
};

export type AddAiGenerationRunInput = {
  id: string;
  workflow: string;
  mode: AiGenerationRun["mode"];
  routeTarget: string;
  answerState: AiGenerationRun["answerState"];
  groundingSource: string;
  costBand: AiGenerationRun["costBand"];
  note: string;
};

export type SaveAiAnswerPacketInput = {
  workflow: string;
  audience: string;
  routeTarget: string;
  continuityState: AiAnswerPacket["continuityState"];
  groundingSources: string;
  answerShape: string;
  note: string;
};

export type AddAiAnswerPacketInput = {
  id: string;
  workflow: string;
  audience: string;
  routeTarget: string;
  continuityState: AiAnswerPacket["continuityState"];
  groundingSources: string;
  answerShape: string;
  note: string;
};

export type RemoveAiRetrievalDatasetInput = {
  source: string;
};

export type RemoveAiGenerationRunInput = {
  workflow: string;
};

export type RemoveAiAnswerPacketInput = {
  workflow: string;
};

type AiGenerationStore = {
  version: number;
  datasets: AiRetrievalDataset[];
  generationRuns: AiGenerationRun[];
  answerPackets: AiAnswerPacket[];
};

type AiGenerationGlobalState = {
  updatedAt: string;
  datasets: AiRetrievalDataset[];
  generationRuns: AiGenerationRun[];
  answerPackets: AiAnswerPacket[];
};

export type AiGenerationMemory = {
  updatedAt: string;
  datasets: AiRetrievalDataset[];
  generationRuns: AiGenerationRun[];
  answerPackets: AiAnswerPacket[];
  summary: {
    retrievalDatasets: number;
    readyDatasets: number;
    storedRuns: number;
    storedAnswerPackets: number;
    liveBlockedPackets: number;
    groundedRouteTargets: number;
  };
  rules: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "ai-generation-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "ai_generation_memory" as const;
let aiGenerationMutationQueue = Promise.resolve();

function mapDatasetStatus(status: string): AiRetrievalDataset["status"] {
  if (status === "In progress") return "Growing";
  if (status === "Planned") return "Needs automation";
  return "Ready";
}

function buildDefaultDatasets(): AiRetrievalDataset[] {
  const retainedChunks = [44, 28, 32, 36, 24];
  const routeTargets = [18, 11, 14, 16, 12];
  const freshness = [
    "Refreshed from editorial reviews this week",
    "Factsheet and document extraction queue staged",
    "Announcement snapshots retained for recent event windows",
    "Relationship graph synced with compare and learning routes",
    "Numeric snapshots retained from source-entry and market-memory lanes",
  ];
  const groundingUse = [
    "Copilot explanations, FAQs, and route-aware summaries",
    "Document-backed extraction and evidence-aware answer packets",
    "Fresh event context for alerts, results-day summaries, and stock follow-through",
    "Route handoffs, peer relationships, and context-aware retrieval narrowing",
    "Grounded numeric answers so AI does not infer market metrics from prose",
  ];

  return knowledgeSourceSamples.map((source, index) => ({
    id: `ai_dataset_${index + 1}`,
    source: source.source,
    role: source.role,
    status: mapDatasetStatus(source.status),
    retainedChunks: retainedChunks[index] ?? 18,
    routeTargets: routeTargets[index] ?? 8,
    freshness: freshness[index] ?? "Refresh window staged in preview memory",
    groundingUse: groundingUse[index] ?? "Grounded retrieval for AI and search",
    note: source.note,
  }));
}

function getWorkflowRouteTarget(title: string) {
  switch (title) {
    case "Portfolio import validator":
      return "/portfolio/import";
    case "Smart result search":
      return "/search";
    case "Alert summarizer":
      return "/alerts";
    case "Editorial copilot":
      return "/admin/content";
    default:
      return "/market-copilot";
  }
}

function buildDefaultGenerationRuns(datasets: AiRetrievalDataset[]): AiGenerationRun[] {
  const groundingSources = [
    datasets.find((dataset) => dataset.source === "source_snapshots")?.source ?? "source_snapshots",
    datasets.find((dataset) => dataset.source === "asset_relationships")?.source ?? "asset_relationships",
    datasets.find((dataset) => dataset.source === "asset_announcements")?.source ?? "asset_announcements",
    datasets.find((dataset) => dataset.source === "editorial_blocks")?.source ?? "editorial_blocks",
  ];

  return aiWorkflowCards.map((card, index) => ({
    id: `ai_run_${index + 1}`,
    workflow: card.title,
    mode:
      card.status === "Now"
        ? "Formula-first"
        : card.status === "Next"
          ? "Hybrid optional AI"
          : "On-demand AI",
    routeTarget: getWorkflowRouteTarget(card.title),
    answerState:
      card.status === "Now" ? "Stored" : card.status === "Next" ? "Queued" : "Needs live provider",
    groundingSource: groundingSources[index] ?? groundingSources[0] ?? "editorial_blocks",
    storedAt: `Apr ${15 - index}, 2026`,
    costBand:
      card.status === "Now" ? "Lowest cost" : card.status === "Next" ? "Budget watch" : "Controlled spend",
    note:
      card.status === "Now"
        ? "This workflow now has a persisted generation-memory row so grounded outputs can be reviewed instead of being treated like ad hoc assistant behavior."
        : card.status === "Next"
          ? "Queue this behind structured retrieval and only promote it once answer packets and source-state review stay auditable."
          : "Do not enable this workflow broadly until retrieval coverage, provider controls, and editorial review all exist together.",
  }));
}

function buildDefaultAnswerPackets(): AiAnswerPacket[] {
  return marketCopilotPlaybooks.map((playbook, index) => ({
    id: `ai_packet_${index + 1}`,
    workflow: playbook.title,
    audience: playbook.audience,
    routeTarget: playbook.routeHandoffs[0]?.href ?? "/market-copilot",
    continuityState:
      index < 2 ? "Stored packet" : index < 4 ? "Preview packet" : "Needs live provider",
    groundingSources:
      index === 0
        ? "source_snapshots + asset_relationships"
        : index === 1
          ? "asset_relationships + editorial_blocks"
          : index === 2
            ? "asset_documents + asset_announcements"
            : index === 3
              ? "source_snapshots + asset_documents"
              : "editorial_blocks + asset_relationships",
    storedAt: `Apr ${15 - index}, 2026`,
    answerShape: playbook.answerShape,
    note:
      index < 2
        ? "Persist this answer packet with source-state labels so the copilot can reuse a grounded explanation before any live model call."
        : index < 4
          ? "Keep this packet in preview memory until deeper retrieval writes and stronger route evidence are in place."
          : "This playbook still needs live provider activation before it should behave like a generated answer lane.",
  }));
}

async function buildDefaultStore(): Promise<AiGenerationStore> {
  const datasets = buildDefaultDatasets();
  return {
    version: STORE_VERSION,
    datasets,
    generationRuns: buildDefaultGenerationRuns(datasets),
    answerPackets: buildDefaultAnswerPackets(),
  };
}

async function readStore(): Promise<AiGenerationStore | null> {
  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<AiGenerationStore>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      datasets: Array.isArray(parsed.datasets)
        ? (parsed.datasets as AiRetrievalDataset[]).map((dataset) => ({ ...dataset }))
        : [],
      generationRuns: Array.isArray(parsed.generationRuns)
        ? (parsed.generationRuns as AiGenerationRun[]).map((run) => ({ ...run }))
        : [],
      answerPackets: Array.isArray(parsed.answerPackets)
        ? (parsed.answerPackets as AiAnswerPacket[]).map((packet) => ({ ...packet }))
        : [],
    };
  } catch {
    return null;
  }
}

async function writeStore(store: AiGenerationStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("AI generation memory"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableAiGenerationState() {
  const payload = await readDurableGlobalStateLane<AiGenerationGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    datasets: (payload.datasets ?? []).map((dataset) => ({ ...dataset })),
    generationRuns: (payload.generationRuns ?? []).map((run) => ({ ...run })),
    answerPackets: (payload.answerPackets ?? []).map((packet) => ({ ...packet })),
  };
}

async function writeDurableAiGenerationState(store: AiGenerationStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    datasets: store.datasets.map((dataset) => ({ ...dataset })),
    generationRuns: store.generationRuns.map((run) => ({ ...run })),
    answerPackets: store.answerPackets.map((packet) => ({ ...packet })),
  });
}

async function persistStore(store: AiGenerationStore) {
  const wroteDurableState = await writeDurableAiGenerationState(store);

  if (wroteDurableState) {
    return;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("AI generation memory"));
  }

  await writeStore(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableAiGenerationState();

  if (durableState) {
    return {
      version: store?.version ?? STORE_VERSION,
      datasets: durableState.datasets,
      generationRuns: durableState.generationRuns,
      answerPackets: durableState.answerPackets,
    };
  }

  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.datasets?.length && store?.generationRuns?.length && store?.answerPackets?.length) {
    await writeDurableAiGenerationState(store);
    return store;
  }

  const nextStore = await buildDefaultStore();
  await persistStore(nextStore);
  return nextStore;
}

export async function getAiGenerationMemory(): Promise<AiGenerationMemory> {
  const store = await ensureStore();

  return {
    updatedAt: new Date().toISOString(),
    datasets: store.datasets,
    generationRuns: store.generationRuns,
    answerPackets: store.answerPackets,
    summary: {
      retrievalDatasets: store.datasets.length,
      readyDatasets: store.datasets.filter((dataset) => dataset.status === "Ready").length,
      storedRuns: store.generationRuns.filter((run) => run.answerState === "Stored").length,
      storedAnswerPackets: store.answerPackets.filter((packet) => packet.continuityState === "Stored packet").length,
      liveBlockedPackets: store.answerPackets.filter((packet) => packet.continuityState === "Needs live provider").length,
      groundedRouteTargets: new Set(store.answerPackets.map((packet) => packet.routeTarget)).size,
    },
    rules: [
      "Every generated answer lane should stay tied to stored grounding sources, a route target, and a clear answer-state label.",
      "Retrieval datasets should grow from trusted internal records, source snapshots, and editorial evidence before live model usage expands.",
      "Market Copilot and other AI-facing routes should reuse persisted answer packets where possible instead of behaving like ad hoc unsaved chat.",
    ],
  };
}

export async function saveAiRetrievalDataset(input: SaveAiRetrievalDatasetInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const datasetIndex = store.datasets.findIndex((item) => item.source === input.source);

    if (datasetIndex === -1) {
      return getAiGenerationMemory();
    }

    const updatedDataset: AiRetrievalDataset = {
      ...store.datasets[datasetIndex],
      status: input.status,
      retainedChunks: Math.max(0, input.retainedChunks),
      routeTargets: Math.max(0, input.routeTargets),
      freshness: input.freshness,
      groundingUse: input.groundingUse,
      note: input.note,
    };

    await persistStore({
      ...store,
      datasets: store.datasets.map((item, index) => (index === datasetIndex ? updatedDataset : item)),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addAiRetrievalDataset(input: AddAiRetrievalDatasetInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.datasets.some((item) => item.id === input.id || item.source === input.source)) {
      throw new Error(`AI retrieval dataset already exists: ${input.source}`);
    }

    const createdDataset: AiRetrievalDataset = {
      id: input.id,
      source: input.source,
      role: input.role,
      status: input.status,
      retainedChunks: Math.max(0, input.retainedChunks),
      routeTargets: Math.max(0, input.routeTargets),
      freshness: input.freshness,
      groundingUse: input.groundingUse,
      note: input.note,
    };

    await persistStore({
      ...store,
      datasets: [...store.datasets, createdDataset],
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function saveAiGenerationRun(input: SaveAiGenerationRunInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const runIndex = store.generationRuns.findIndex((item) => item.workflow === input.workflow);

    if (runIndex === -1) {
      return getAiGenerationMemory();
    }

    const updatedRun: AiGenerationRun = {
      ...store.generationRuns[runIndex],
      answerState: input.answerState,
      groundingSource: input.groundingSource,
      routeTarget: input.routeTarget,
      costBand: input.costBand,
      storedAt: new Date().toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
      note: input.note,
    };

    await persistStore({
      ...store,
      generationRuns: store.generationRuns.map((item, index) => (index === runIndex ? updatedRun : item)),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addAiGenerationRun(input: AddAiGenerationRunInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.generationRuns.some((item) => item.id === input.id || item.workflow === input.workflow)) {
      throw new Error(`AI generation run already exists: ${input.workflow}`);
    }

    const createdRun: AiGenerationRun = {
      id: input.id,
      workflow: input.workflow,
      mode: input.mode,
      routeTarget: input.routeTarget,
      answerState: input.answerState,
      groundingSource: input.groundingSource,
      storedAt: new Date().toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
      costBand: input.costBand,
      note: input.note,
    };

    await persistStore({
      ...store,
      generationRuns: [...store.generationRuns, createdRun],
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function saveAiAnswerPacket(input: SaveAiAnswerPacketInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const packetIndex = store.answerPackets.findIndex((item) => item.workflow === input.workflow);

    if (packetIndex === -1) {
      return getAiGenerationMemory();
    }

    const updatedPacket: AiAnswerPacket = {
      ...store.answerPackets[packetIndex],
      audience: input.audience,
      routeTarget: input.routeTarget,
      continuityState: input.continuityState,
      groundingSources: input.groundingSources,
      answerShape: input.answerShape,
      storedAt: new Date().toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
      note: input.note,
    };

    await persistStore({
      ...store,
      answerPackets: store.answerPackets.map((item, index) => (index === packetIndex ? updatedPacket : item)),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addAiAnswerPacket(input: AddAiAnswerPacketInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.answerPackets.some((item) => item.id === input.id || item.workflow === input.workflow)) {
      throw new Error(`AI answer packet already exists: ${input.workflow}`);
    }

    const createdPacket: AiAnswerPacket = {
      id: input.id,
      workflow: input.workflow,
      audience: input.audience,
      routeTarget: input.routeTarget,
      continuityState: input.continuityState,
      groundingSources: input.groundingSources,
      storedAt: new Date().toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
      answerShape: input.answerShape,
      note: input.note,
    };

    await persistStore({
      ...store,
      answerPackets: [...store.answerPackets, createdPacket],
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeAiRetrievalDataset(input: RemoveAiRetrievalDatasetInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const source = input.source.trim();

    if (!source) {
      throw new Error("Dataset source is required.");
    }

    if (!store.datasets.some((item) => item.source === source)) {
      throw new Error(`Unknown AI retrieval dataset: ${source}`);
    }

    await persistStore({
      ...store,
      datasets: store.datasets.filter((item) => item.source !== source),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeAiGenerationRun(input: RemoveAiGenerationRunInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const workflow = input.workflow.trim();

    if (!workflow) {
      throw new Error("Workflow is required.");
    }

    if (!store.generationRuns.some((item) => item.workflow === workflow)) {
      throw new Error(`Unknown AI generation run: ${workflow}`);
    }

    await persistStore({
      ...store,
      generationRuns: store.generationRuns.filter((item) => item.workflow !== workflow),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeAiAnswerPacket(input: RemoveAiAnswerPacketInput): Promise<AiGenerationMemory> {
  const mutation = aiGenerationMutationQueue.then(async () => {
    const store = await ensureStore();
    const workflow = input.workflow.trim();

    if (!workflow) {
      throw new Error("Workflow is required.");
    }

    if (!store.answerPackets.some((item) => item.workflow === workflow)) {
      throw new Error(`Unknown AI answer packet: ${workflow}`);
    }

    await persistStore({
      ...store,
      answerPackets: store.answerPackets.filter((item) => item.workflow !== workflow),
    });

    return getAiGenerationMemory();
  });

  aiGenerationMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
