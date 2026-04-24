import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { blockEditorSamples } from "@/lib/block-editor";
import { editorialWorkflowSamples } from "@/lib/editorial-ops";

export type EditorialRevisionEntry = {
  id: string;
  asset: string;
  assetType: string;
  editor: string;
  action: string;
  changedFields: string;
  time: string;
  reason: string;
  revisionState: "Published" | "Review ready" | "Rollback staged";
  rollbackReady: "Yes" | "Needs capture";
  routeTarget: string;
};

export type RollbackScenarioEntry = {
  id: string;
  asset: string;
  change: string;
  risk: "Low" | "Medium" | "High";
  fallback: string;
  lastKnownGood: string;
  queueState: "Ready" | "Needs approval" | "Needs source reset";
  routeTarget: string;
};

export type RevisionFamilyLane = {
  family: string;
  trackedAssets: number;
  rollbackReadyAssets: number;
  latestState: "Growing" | "Needs deeper coverage";
  note: string;
};

export type SaveEditorialRevisionInput = {
  asset: string;
  assetType: string;
  editor: string;
  action: string;
  changedFields: string;
  reason: string;
  revisionState: "Published" | "Review ready" | "Rollback staged";
  routeTarget: string;
};

export type RemoveEditorialRevisionInput = {
  id: string;
};

export type SaveRollbackQueueInput = {
  asset: string;
  change: string;
  queueState: "Ready" | "Needs approval" | "Needs source reset";
};

export type AddRollbackScenarioInput = {
  asset: string;
  change: string;
  risk: RollbackScenarioEntry["risk"];
  fallback: string;
  lastKnownGood: string;
  queueState: RollbackScenarioEntry["queueState"];
  routeTarget: string;
};

export type RemoveRollbackScenarioInput = {
  id: string;
};

type EditorialRevisionStore = {
  version: number;
  revisions: EditorialRevisionEntry[];
  rollbackScenarios: RollbackScenarioEntry[];
  familyLanes: RevisionFamilyLane[];
};

export type EditorialRevisionMemory = {
  updatedAt: string;
  revisions: EditorialRevisionEntry[];
  rollbackScenarios: RollbackScenarioEntry[];
  familyLanes: RevisionFamilyLane[];
  summary: {
    loggedRevisions: number;
    rollbackReadyAssets: number;
    highRiskChanges: number;
    archivedVersions: number;
    trackedFamilies: number;
    reviewReadyChanges: number;
  };
  rules: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "editorial-revision-memory.json");
const STORE_VERSION = 1;
let editorialRevisionMutationQueue = Promise.resolve();

function buildDefaultRevisions(): EditorialRevisionEntry[] {
  const baseEntries: EditorialRevisionEntry[] = [
    {
      id: "rev_001",
      asset: "Hero Fincorp IPO",
      assetType: "IPO page",
      editor: "Staff Editor",
      action: "Updated GMP note and issue-size card",
      changedFields: "gmp_note, issue_size_card",
      time: "April 12, 2026 • 5:20 PM IST",
      reason: "Source note adjusted after internal review",
      revisionState: "Published",
      rollbackReady: "Yes",
      routeTarget: "/ipo/hero-fincorp",
    },
    {
      id: "rev_002",
      asset: "Tata Motors",
      assetType: "Stock page",
      editor: "Admin",
      action: "Revised summary block and added chart-first CTA",
      changedFields: "hero_summary, chart_cta",
      time: "April 12, 2026 • 4:45 PM IST",
      reason: "Improve landing-page flow before chart-route deepening",
      revisionState: "Published",
      rollbackReady: "Yes",
      routeTarget: "/stocks/tata-motors",
    },
    {
      id: "rev_003",
      asset: "Nifty50",
      assetType: "Index tracker",
      editor: "Staff Editor",
      action: "Adjusted sentiment description and puller labels",
      changedFields: "sentiment_description, puller_labels",
      time: "April 12, 2026 • 3:10 PM IST",
      reason: "Clarify intraday tracker presentation",
      revisionState: "Rollback staged",
      rollbackReady: "Yes",
      routeTarget: "/nifty50",
    },
  ];

  const blockEntries = blockEditorSamples.map((item, index) => ({
    id: `rev_block_${index + 1}`,
    asset: item.asset,
    assetType: `${item.mode} block`,
    editor: "Editor Queue",
    action: `Queued ${item.block} block for controlled edit`,
    changedFields: item.block,
    time: `April ${11 - index}, 2026 • ${3 + index}:15 PM IST`,
    reason: item.note,
    revisionState: index === 0 ? ("Review ready" as const) : ("Published" as const),
    rollbackReady: item.mode === "Editorial" ? ("Needs capture" as const) : ("Yes" as const),
    routeTarget:
      item.asset === "Hero FinCorp IPO"
        ? "/ipo/hero-fincorp"
        : item.asset === "Tata Motors"
          ? "/stocks/tata-motors"
          : "/mutual-funds/hdfc-mid-cap-opportunities",
  }));

  const workflowEntries = editorialWorkflowSamples.map((item, index) => ({
    id: `rev_flow_${index + 1}`,
    asset: item.entityLabel,
    assetType: item.entityType.replaceAll("_", " "),
    editor: item.assignedTo,
    action: `Workflow moved into ${item.workflowState}`,
    changedFields: item.entityLabel.split("/")[1] ?? item.entityType,
    time: `${item.dueAt} • editorial queue`,
    reason: item.note,
    revisionState:
      item.workflowState === "publish_ready"
        ? ("Review ready" as const)
        : item.workflowState === "review"
          ? ("Rollback staged" as const)
          : ("Published" as const),
    rollbackReady: item.workflowState === "draft" ? ("Needs capture" as const) : ("Yes" as const),
    routeTarget:
      index === 0 ? "/stocks/tata-motors" : index === 1 ? "/ipo/hero-fincorp" : "/admin/documents",
  }));

  return [...baseEntries, ...blockEntries, ...workflowEntries];
}

function buildDefaultRollbackScenarios(): RollbackScenarioEntry[] {
  return [
    {
      id: "rollback_001",
      asset: "Hero Fincorp IPO",
      change: "Issue review and GMP explanation updated",
      risk: "Medium",
      fallback: "Restore previous editorial block version",
      lastKnownGood: "Revision snapshot from Apr 11, 2026",
      queueState: "Ready",
      routeTarget: "/ipo/hero-fincorp",
    },
    {
      id: "rollback_002",
      asset: "Tata Motors",
      change: "Pinned filings summary adjusted for homepage cross-linking",
      risk: "Low",
      fallback: "Revert block content and re-run announcement sync",
      lastKnownGood: "Revision snapshot from Apr 11, 2026",
      queueState: "Ready",
      routeTarget: "/stocks/tata-motors",
    },
    {
      id: "rollback_003",
      asset: "Nifty50",
      change: "Sentiment wording override modified intraday",
      risk: "High",
      fallback: "Return to source-backed sentiment description",
      lastKnownGood: "Source-backed sentiment packet from Apr 12, 2026",
      queueState: "Needs source reset",
      routeTarget: "/nifty50",
    },
    {
      id: "rollback_004",
      asset: "HDFC Mid-Cap Opportunities",
      change: "Fund-manager block enriched with manual commentary",
      risk: "Medium",
      fallback: "Restore last hybrid block revision and keep factsheet evidence attached",
      lastKnownGood: "Revision snapshot from Apr 10, 2026",
      queueState: "Needs approval",
      routeTarget: "/mutual-funds/hdfc-mid-cap-opportunities",
    },
  ];
}

function buildDefaultFamilyLanes(
  revisions: EditorialRevisionEntry[],
  rollbackScenarios: RollbackScenarioEntry[],
): RevisionFamilyLane[] {
  const families = [
    { family: "Stocks", match: (target: string) => target.startsWith("/stocks/") },
    { family: "IPOs", match: (target: string) => target.startsWith("/ipo/") },
    { family: "Funds", match: (target: string) => target.startsWith("/mutual-funds/") },
    { family: "Indices and markets", match: (target: string) => ["/nifty50", "/sensex", "/markets"].includes(target) || target.startsWith("/nifty50") },
    { family: "Editorial admin", match: (target: string) => target.startsWith("/admin/") },
  ];

  return families.map((family) => {
    const familyRevisions = revisions.filter((entry) => family.match(entry.routeTarget));
    const familyRollback = rollbackScenarios.filter((entry) => family.match(entry.routeTarget));
    const rollbackReadyAssets = familyRevisions.filter((entry) => entry.rollbackReady === "Yes").length;

    return {
      family: family.family,
      trackedAssets: new Set([...familyRevisions.map((entry) => entry.asset), ...familyRollback.map((entry) => entry.asset)]).size,
      rollbackReadyAssets,
      latestState:
        familyRevisions.length > 0 && familyRollback.length > 0 ? "Growing" : "Needs deeper coverage",
      note:
        familyRevisions.length > 0
          ? "This family now has persisted revision rows and rollback posture instead of relying only on admin planning cards."
          : "This family still needs broader write-through coverage so rollback and field-level change capture stay complete.",
    };
  });
}

async function buildDefaultStore(): Promise<EditorialRevisionStore> {
  const revisions = buildDefaultRevisions();
  const rollbackScenarios = buildDefaultRollbackScenarios();
  return {
    version: STORE_VERSION,
    revisions,
    rollbackScenarios,
    familyLanes: buildDefaultFamilyLanes(revisions, rollbackScenarios),
  };
}

async function readStore(): Promise<EditorialRevisionStore | null> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as EditorialRevisionStore;
  } catch {
    return null;
  }
}

async function writeStore(store: EditorialRevisionStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.revisions?.length && store?.rollbackScenarios?.length && store?.familyLanes?.length) {
    return store;
  }

  const nextStore = await buildDefaultStore();
  await writeStore(nextStore);
  return nextStore;
}

export async function getEditorialRevisionMemory(): Promise<EditorialRevisionMemory> {
  const store = await ensureStore();

  return {
    updatedAt: new Date().toISOString(),
    revisions: store.revisions,
    rollbackScenarios: store.rollbackScenarios,
    familyLanes: store.familyLanes,
    summary: {
      loggedRevisions: store.revisions.length,
      rollbackReadyAssets: store.revisions.filter((entry) => entry.rollbackReady === "Yes").length,
      highRiskChanges: store.rollbackScenarios.filter((entry) => entry.risk === "High").length,
      archivedVersions: store.revisions.filter((entry) => entry.revisionState !== "Review ready").length * 2,
      trackedFamilies: store.familyLanes.length,
      reviewReadyChanges: store.revisions.filter((entry) => entry.revisionState === "Review ready").length,
    },
    rules: [
      "Every publish, override, or editorial workflow change should create a revision row with changed fields, actor, time, reason, and route target.",
      "Rollback should restore the prior snapshot without deleting the newer one from audit history or source lineage.",
      "Revision coverage should expand by asset family so stocks, IPOs, funds, indices, and editorial admin flows all share the same write-through discipline.",
    ],
  };
}

export async function saveEditorialRevision(input: SaveEditorialRevisionInput): Promise<EditorialRevisionMemory> {
  const mutation = editorialRevisionMutationQueue.then(async () => {
    const store = await ensureStore();
    const revision: EditorialRevisionEntry = {
      id: `rev_${store.revisions.length + 1}`.replace(/[^a-z0-9_]/gi, "_"),
      asset: input.asset,
      assetType: input.assetType,
      editor: input.editor,
      action: input.action,
      changedFields: input.changedFields,
      time: new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      reason: input.reason,
      revisionState: input.revisionState,
      rollbackReady: input.revisionState === "Review ready" ? "Needs capture" : "Yes",
      routeTarget: input.routeTarget,
    };
    const revisions = [revision, ...store.revisions];
    const nextStore: EditorialRevisionStore = {
      ...store,
      revisions,
      familyLanes: buildDefaultFamilyLanes(revisions, store.rollbackScenarios),
    };

    await writeStore(nextStore);
    return getEditorialRevisionMemory();
  });

  editorialRevisionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeEditorialRevision(input: RemoveEditorialRevisionInput): Promise<EditorialRevisionMemory> {
  const mutation = editorialRevisionMutationQueue.then(async () => {
    const store = await ensureStore();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Revision id is required.");
    }

    const revisions = store.revisions.filter((item) => item.id !== id);

    if (revisions.length === store.revisions.length) {
      throw new Error(`Unknown revision row: ${id}`);
    }

    const nextStore: EditorialRevisionStore = {
      ...store,
      revisions,
      familyLanes: buildDefaultFamilyLanes(revisions, store.rollbackScenarios),
    };

    await writeStore(nextStore);
    return getEditorialRevisionMemory();
  });

  editorialRevisionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function saveRollbackQueueState(input: SaveRollbackQueueInput): Promise<EditorialRevisionMemory> {
  const mutation = editorialRevisionMutationQueue.then(async () => {
    const store = await ensureStore();
    const nextRollbackScenarios = store.rollbackScenarios.map((item) =>
      item.asset === input.asset && item.change === input.change
        ? {
            ...item,
            queueState: input.queueState,
          }
        : item,
    );
    const nextStore: EditorialRevisionStore = {
      ...store,
      rollbackScenarios: nextRollbackScenarios,
      familyLanes: buildDefaultFamilyLanes(store.revisions, nextRollbackScenarios),
    };

    await writeStore(nextStore);
    return getEditorialRevisionMemory();
  });

  editorialRevisionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addRollbackScenario(input: AddRollbackScenarioInput): Promise<EditorialRevisionMemory> {
  const mutation = editorialRevisionMutationQueue.then(async () => {
    const store = await ensureStore();
    const rollbackScenario: RollbackScenarioEntry = {
      id: `rollback_${store.rollbackScenarios.length + 1}`.replace(/[^a-z0-9_]/gi, "_"),
      asset: input.asset,
      change: input.change,
      risk: input.risk,
      fallback: input.fallback,
      lastKnownGood: input.lastKnownGood,
      queueState: input.queueState,
      routeTarget: input.routeTarget,
    };
    const rollbackScenarios = [
      rollbackScenario,
      ...store.rollbackScenarios.filter((item) => !(item.asset === rollbackScenario.asset && item.change === rollbackScenario.change)),
    ];
    const nextStore: EditorialRevisionStore = {
      ...store,
      rollbackScenarios,
      familyLanes: buildDefaultFamilyLanes(store.revisions, rollbackScenarios),
    };

    await writeStore(nextStore);
    return getEditorialRevisionMemory();
  });

  editorialRevisionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeRollbackScenario(input: RemoveRollbackScenarioInput): Promise<EditorialRevisionMemory> {
  const mutation = editorialRevisionMutationQueue.then(async () => {
    const store = await ensureStore();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Rollback scenario id is required.");
    }

    const rollbackScenarios = store.rollbackScenarios.filter((item) => item.id !== id);

    if (rollbackScenarios.length === store.rollbackScenarios.length) {
      throw new Error(`Unknown rollback scenario: ${id}`);
    }

    const nextStore: EditorialRevisionStore = {
      ...store,
      rollbackScenarios,
      familyLanes: buildDefaultFamilyLanes(store.revisions, rollbackScenarios),
    };

    await writeStore(nextStore);
    return getEditorialRevisionMemory();
  });

  editorialRevisionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
