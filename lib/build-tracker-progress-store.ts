import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import {
  backendPendingChecklist,
  buildTrackerPhases,
  currentFocus,
  privateBetaReadinessSections,
  recentWins,
} from "@/lib/build-tracker";
import {
  getLaunchCutoverChecklistMemory,
  type LaunchCutoverChecklistMemory,
} from "@/lib/launch-cutover-checklist-memory-store";
import { getLaunchCommitmentItems } from "@/lib/launch-commitments";
import { getImmediateLaunchBlockers } from "@/lib/launch-readiness";
import { getLaunchState } from "@/lib/launch-state";
import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";

export type BuildTrackerProgressSnapshot = {
  totalPercent: number;
  buildSidePercent: number;
  launchReadinessPercent: number;
  updatedAt: string;
  summary: string;
};

export type BuildTrackerProgressHistoryEntry = {
  at: string;
  percent: number;
  buildSidePercent: number;
  launchReadinessPercent: number;
  note: string;
};

type BuildTrackerProgressStore = {
  version: number;
  history: BuildTrackerProgressHistoryEntry[];
};

const BUILD_SIDE_WEIGHT = 75;
const LAUNCH_SIDE_WEIGHT = 25;
const STORE_VERSION = 1;
const PROGRESS_STORE_PATH = path.join(process.cwd(), "data", "build-tracker-progress-history.json");
const PROGRESS_MD_PATH = path.join(process.cwd(), "docs", "PROGRESS.md");

const legacyHistorySeed: BuildTrackerProgressHistoryEntry[] = [
  {
    at: "Apr 09, 2026 09:30 PM IST",
    percent: 68,
    buildSidePercent: 86,
    launchReadinessPercent: 14,
    note: "The public product shell, launch tracker, and first operator desks were in place, but the launch view was still fragmented and much of the backend truth was preview-heavy.",
  },
  {
    at: "Apr 11, 2026 11:10 PM IST",
    percent: 71,
    buildSidePercent: 89,
    launchReadinessPercent: 17,
    note: "Launch-config, source-readiness, and the first real backend mutation lanes made activation and operator work more concrete instead of living only in static setup notes.",
  },
  {
    at: "Apr 13, 2026 10:20 PM IST",
    percent: 73,
    buildSidePercent: 91,
    launchReadinessPercent: 19,
    note: "Subscriber, billing, delivery, source-job, archive, and portfolio lanes gained broader write or cleanup coverage, reducing the gap between built surfaces and working backend behavior.",
  },
  {
    at: "Apr 15, 2026 09:05 PM IST",
    percent: 74,
    buildSidePercent: 92,
    launchReadinessPercent: 20,
    note: "The build tracker became the one pending-first launch control page, with launch blockers, checklist, pending audit, and operator links merged into one place instead of scattered desks.",
  },
  {
    at: "Apr 16, 2026 01:49 PM IST",
    percent: 75,
    buildSidePercent: 92,
    launchReadinessPercent: 25,
    note: "Launch-control, owner-inbox, and more launch-governance boards now write into the shared revision backend, and the tracker now explains the real missing 25% in plain English.",
  },
];

let progressMutationQueue: Promise<void> = Promise.resolve();

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatusScore(status: string) {
  switch (status) {
    case "Complete":
    case "Ready":
      return 1;
    case "In progress":
    case "Needs verification":
      return 0.5;
    case "Next":
      return 0.25;
    case "Needs activation":
    case "Blocked":
    case "Required":
    case "Pending":
    case "Needs input":
    case "Planned":
    default:
      return 0;
  }
}

function averageScore(statuses: string[]) {
  if (statuses.length === 0) {
    return 1;
  }

  const total = statuses.reduce((sum, status) => sum + getStatusScore(status), 0);
  return total / statuses.length;
}

function getPrivateBetaStatusScore(status: string) {
  switch (status) {
    case "Ready":
    case "Deferred":
      return 1;
    case "In progress":
      return 0.5;
    case "Critical now":
      return 0;
    default:
      return getStatusScore(status);
  }
}

function averagePrivateBetaScore(statuses: string[]) {
  if (statuses.length === 0) {
    return 1;
  }

  const total = statuses.reduce((sum, status) => sum + getPrivateBetaStatusScore(status), 0);
  return total / statuses.length;
}

function formatTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("month")} ${getPart("day")}, ${getPart("year")} ${getPart("hour")}:${getPart("minute")} ${getPart("dayPeriod").toUpperCase()} IST`;
}

function truncateCopy(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

async function readStore() {
  if (!canUseFileFallback()) {
    return null;
  }

  try {
    const content = await readFile(PROGRESS_STORE_PATH, "utf8");
    return JSON.parse(content) as BuildTrackerProgressStore;
  } catch {
    return null;
  }
}

async function writeStore(store: BuildTrackerProgressStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Build tracker progress history"));
  }

  await mkdir(path.dirname(PROGRESS_STORE_PATH), { recursive: true });
  await writeFile(PROGRESS_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      history: legacyHistorySeed,
    };
  }

  const exists = await access(PROGRESS_STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (exists && store?.history) {
    return store;
  }

  const seededStore = {
    version: STORE_VERSION,
    history: legacyHistorySeed,
  };
  await writeStore(seededStore);
  return seededStore;
}

async function getLatestProgressNote() {
  try {
    const content = await readFile(PROGRESS_MD_PATH, "utf8");
    const latestSection = content.split("### Latest execution layer")[1] ?? "";
    const firstBullet = latestSection
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("- "));

    if (firstBullet) {
      return truncateCopy(firstBullet.replace(/^- /, ""), 240);
    }
  } catch {
    // Fall through to repo-native fallbacks.
  }

  return truncateCopy(
    currentFocus[0] ?? recentWins[0] ?? "Progress is being computed from the live launch and backend tracker buckets.",
    240,
  );
}

function computeBuildSidePercent() {
  const allStatuses = buildTrackerPhases.flatMap((phase) => phase.items.map((item) => item.status));
  return clampPercent(averageScore(allStatuses) * 100);
}

async function computeLaunchReadinessPercent(launchCutoverChecklistMemory?: LaunchCutoverChecklistMemory) {
  const launchState = getLaunchState();

  if (launchState.mode === "internal_review" || launchState.mode === "private_beta") {
    return clampPercent(
      averagePrivateBetaScore(privateBetaReadinessSections.map((item) => item.status)) * 100,
    );
  }

  const checklistMemory = launchCutoverChecklistMemory ?? (await getLaunchCutoverChecklistMemory());
  const productionStatuses = getImmediateLaunchBlockers().map((item) => item.status);
  const backendStatuses = backendPendingChecklist.flatMap((group) => group.items.map((item) => item.status));
  const rehearsalStatuses = [
    ...getPublicLaunchQaItems().map((item) => item.status),
    ...getLaunchCommitmentItems().map((item) => item.status),
  ];
  const manualStatuses = checklistMemory.items.map((item) => (item.completed ? "Ready" : item.autoStatus));
  const earnedPoints =
    averageScore(productionStatuses) * 10 +
    averageScore(backendStatuses) * 8 +
    averageScore(rehearsalStatuses) * 5 +
    averageScore(manualStatuses) * 2;

  return clampPercent((earnedPoints / LAUNCH_SIDE_WEIGHT) * 100);
}

function buildProgressSummary(input: {
  buildSidePercent: number;
  launchReadinessPercent: number;
}) {
  const launchState = getLaunchState();
  const launchBlockers = getImmediateLaunchBlockers();
  const activationCount = launchBlockers.filter((item) => item.status === "Needs activation").length;
  const verificationCount = launchBlockers.filter((item) => item.status === "Needs verification").length;
  const pendingBackendCount = backendPendingChecklist.flatMap((group) => group.items).filter((item) => item.status !== "Complete").length;

  if (launchState.mode === "internal_review" || launchState.mode === "private_beta") {
    const activePrivateBetaBlockers = launchBlockers.filter((item) => item.status !== "Ready").length;

    if (activePrivateBetaBlockers === 0 && input.launchReadinessPercent === 100) {
      return `Build-side completion is ${input.buildSidePercent}%. Invite-only private-beta readiness is ${input.launchReadinessPercent}%, and no active blocker remains in the current beta proof set.`;
    }

    return `Build-side completion is ${input.buildSidePercent}%. Invite-only private-beta readiness is ${input.launchReadinessPercent}%, with ${activePrivateBetaBlockers} active blocker lanes still visible in the current beta proof set.`;
  }

  return `Build-side completion is ${input.buildSidePercent}%. Public-launch readiness is ${input.launchReadinessPercent}%, with ${activationCount} readiness blockers still needing activation, ${verificationCount} needing live proof, and ${pendingBackendCount} macro backend lanes still in progress.`;
}

export async function getBuildTrackerProgressMemory(options?: {
  launchCutoverChecklistMemory?: LaunchCutoverChecklistMemory;
}) {
  const checklistMemory = options?.launchCutoverChecklistMemory ?? (await getLaunchCutoverChecklistMemory());
  const buildSidePercent = computeBuildSidePercent();
  const launchReadinessPercent = await computeLaunchReadinessPercent(checklistMemory);
  const buildGap = BUILD_SIDE_WEIGHT * (1 - buildSidePercent / 100);
  const launchGap = LAUNCH_SIDE_WEIGHT * (1 - launchReadinessPercent / 100);
  const totalPercent = clampPercent(100 - buildGap - launchGap);
  const updatedAt = formatTimestamp();
  const note = await getLatestProgressNote();
  const snapshot: BuildTrackerProgressSnapshot = {
    totalPercent,
    buildSidePercent,
    launchReadinessPercent,
    updatedAt,
    summary: buildProgressSummary({ buildSidePercent, launchReadinessPercent }),
  };
  let memory: { snapshot: BuildTrackerProgressSnapshot; history: BuildTrackerProgressHistoryEntry[] } | null = null;

  await (progressMutationQueue = progressMutationQueue.then(async () => {
    const store = await ensureStore();
    const latestEntry = store.history.at(-1);
    const shouldAppend =
      !latestEntry ||
      Math.abs(latestEntry.percent - totalPercent) >= 1 ||
      latestEntry.buildSidePercent !== buildSidePercent ||
      latestEntry.launchReadinessPercent !== launchReadinessPercent ||
      latestEntry.note !== note;
    const history = shouldAppend
      ? [
          ...store.history,
          {
            at: updatedAt,
            percent: totalPercent,
            buildSidePercent,
            launchReadinessPercent,
            note,
          },
        ]
      : store.history;

    if (shouldAppend) {
      await writeStore({
        version: STORE_VERSION,
        history,
      });
    }

    memory = {
      snapshot,
      history,
    };
  }));

  return memory ?? {
    snapshot,
    history: legacyHistorySeed,
  };
}
