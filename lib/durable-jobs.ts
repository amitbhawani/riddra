import { auth as triggerAuth, runs, tasks } from "@trigger.dev/sdk/v3";

import { isHostedAppRuntime } from "@/lib/durable-data-runtime";
import { getResendReadiness } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { getHostedRuntimeRequirements, getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getTriggerAuthConfig, getTriggerCliAuthConfig } from "@/lib/trigger-auth";
import { getConfiguredTriggerProjectRef } from "@/lib/trigger-config";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type DurableJobFamily =
  | "market_data"
  | "reconciliation"
  | "notification"
  | "support"
  | "search"
  | "archive_refresh"
  | "broker_sync";

export type DurableJobTaskDefinition = {
  family: DurableJobFamily;
  taskId: string;
  label: string;
  routeTarget: string;
  note: string;
};

export type DurableJobRun = {
  id: string;
  family: DurableJobFamily;
  taskId: string;
  label: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  tags: string[];
  isSuccess: boolean;
  isFailed: boolean;
  metadata: Record<string, JsonValue> | undefined;
  errorMessage: string | null;
};

export type DurableJobRunList = {
  configured: boolean;
  error?: string | null;
  items: DurableJobRun[];
  summary: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  };
};

export const durableJobTaskDefinitions: DurableJobTaskDefinition[] = [
  {
    family: "market_data",
    taskId: "market-data-provider-sync",
    label: "Market data provider sync",
    routeTarget: "/api/market-data/provider-sync",
    note: "Pulls a provider payload, validates it, and writes source snapshots through the durable worker lane.",
  },
  {
    family: "market_data",
    taskId: "market-data-snapshot-refresh",
    label: "Market data snapshot refresh",
    routeTarget: "/api/market-data/refresh",
    note: "Refreshes the first-wave market snapshot coverage through the durable worker lane.",
  },
  {
    family: "market_data",
    taskId: "yahoo-daily-update-cron-worker",
    label: "Yahoo daily update cron worker",
    routeTarget: "/api/cron/yahoo-daily-update",
    note: "Processes a bounded strict same-day Yahoo update slice for the queued cron batch job, then requeues the next slice if work remains.",
  },
  {
    family: "reconciliation",
    taskId: "portfolio-reconciliation-checkpoint",
    label: "Portfolio reconciliation checkpoint",
    routeTarget: "/api/portfolio/reconciliations",
    note: "Creates a durable reconciliation checkpoint after a protected account confirms the current mismatch queue.",
  },
  {
    family: "notification",
    taskId: "notification-delivery-follow-up",
    label: "Notification delivery follow-up",
    routeTarget: "/api/account/consents/events",
    note: "Advances consent-aware delivery events through a durable follow-up and retry lane.",
  },
  {
    family: "support",
    taskId: "support-follow-up",
    label: "Support follow-up",
    routeTarget: "/api/account/support/follow-up",
    note: "Turns subscriber support callbacks into durable follow-up work instead of ad hoc notes.",
  },
  {
    family: "support",
    taskId: "contact-request-delivery",
    label: "Contact request delivery",
    routeTarget: "/api/contact/requests",
    note: "Sends contact acknowledgements and internal support inbox notifications through the durable email lane.",
  },
  {
    family: "notification",
    taskId: "account-change-alert",
    label: "Account change alert",
    routeTarget: "/api/account/consents/items",
    note: "Sends consent and account change alerts after protected subscriber settings mutate.",
  },
  {
    family: "search",
    taskId: "search-index-rebuild",
    label: "Search index rebuild",
    routeTarget: "/api/admin/search-index/rebuild",
    note: "Rebuilds the Meilisearch-backed search document layer and backlog summaries through a durable worker run.",
  },
  {
    family: "archive_refresh",
    taskId: "archive-refresh-execution",
    label: "Archive refresh execution",
    routeTarget: "/api/admin/archive-refresh/run",
    note: "Runs the internal archive refresh lane through Trigger.dev and mirrors the outcome into archive continuity and research-memory surfaces.",
  },
  {
    family: "broker_sync",
    taskId: "broker-sync-execution",
    label: "Broker sync execution",
    routeTarget: "/api/account/brokers/runs",
    note: "Runs the internal broker adapter queue through Trigger.dev and hydrates linked-account plus approval-first review state for the signed-in workspace.",
  },
];

function getTaskDefinition(taskId: string) {
  return durableJobTaskDefinitions.find((item) => item.taskId === taskId);
}

function inferFamilyFromTask(taskId: string): DurableJobFamily {
  return getTaskDefinition(taskId)?.family ?? "market_data";
}

function normalizeStatus(status: string) {
  switch (status) {
    case "QUEUED":
    case "PENDING_VERSION":
    case "DELAYED":
      return "Queued";
    case "DEQUEUED":
    case "EXECUTING":
    case "WAITING":
      return "Running";
    case "COMPLETED":
      return "Succeeded";
    case "FAILED":
    case "CRASHED":
    case "SYSTEM_FAILURE":
    case "TIMED_OUT":
      return "Failed";
    case "CANCELED":
    case "EXPIRED":
      return "Stopped";
    default:
      return status;
  }
}

export function getDurableJobSystemReadiness() {
  const triggerAuthConfig = getTriggerAuthConfig();
  const triggerProjectRef = getConfiguredTriggerProjectRef();
  const hostedRequirements = getHostedRuntimeRequirements();

  return {
    triggerSecretReady: triggerAuthConfig.configured,
    triggerSecretSource: triggerAuthConfig.source,
    triggerProjectReady: Boolean(triggerProjectRef),
    triggerProjectRef,
    missingEnv: hostedRequirements.missingTrigger,
    configured: Boolean(triggerAuthConfig.configured && triggerProjectRef),
    totalTaskFamilies: new Set(durableJobTaskDefinitions.map((item) => item.family)).size,
    totalTasks: durableJobTaskDefinitions.length,
  };
}

export function getTransactionalDeliveryReadiness() {
  const config = getRuntimeLaunchConfig();
  const resend = getResendReadiness();
  const supportContactReady = Boolean(config.supportEmail || config.contactEmail || config.billingSupportEmail);
  const triggerReady = getDurableJobSystemReadiness().configured;

  return {
    supportContactReady,
    resendReady: resend.configured,
    triggerReady,
    configured: supportContactReady && resend.configured && triggerReady,
  };
}

export function assertDurableJobsConfigured() {
  if (!getTriggerAuthConfig().configured) {
    throw new Error(
      isHostedAppRuntime()
        ? "Trigger.dev is not configured for hosted mode. Set TRIGGER_SECRET_KEY and TRIGGER_PROJECT_REF."
        : "Trigger.dev is not configured. Run `trigger.dev login` locally or set TRIGGER_SECRET_KEY.",
    );
  }
}

function configureTriggerSdkClient() {
  const triggerAuthConfig = getTriggerAuthConfig();

  if (!triggerAuthConfig.configured) {
    throw new Error(
      isHostedAppRuntime()
        ? "Trigger.dev is not configured for hosted mode. Set TRIGGER_SECRET_KEY and TRIGGER_PROJECT_REF."
        : "Trigger.dev is not configured. Run `trigger.dev login` locally or set TRIGGER_SECRET_KEY.",
    );
  }

  triggerAuth.configure({
    accessToken: triggerAuthConfig.accessToken!,
    baseURL: triggerAuthConfig.apiUrl,
  });

  return triggerAuthConfig;
}

function configureTriggerSdkClientWithConfig(config: { accessToken: string; apiUrl: string }) {
  triggerAuth.configure({
    accessToken: config.accessToken,
    baseURL: config.apiUrl,
  });
}

type QueueDurableJobInput = {
  taskId: string;
  payload: Record<string, JsonValue>;
  tags?: string[];
  metadata?: Record<string, JsonValue>;
  idempotencyKey?: string;
};

export async function queueDurableJob(input: QueueDurableJobInput) {
  assertDurableJobsConfigured();
  configureTriggerSdkClient();

  return tasks.trigger(input.taskId, input.payload, {
    tags: input.tags,
    metadata: input.metadata,
    idempotencyKey: input.idempotencyKey,
  });
}

type ListDurableJobRunsOptions = {
  family?: DurableJobFamily;
  limit?: number;
};

export async function listDurableJobRuns(options: ListDurableJobRunsOptions = {}): Promise<DurableJobRunList> {
  const triggerProjectRef = getConfiguredTriggerProjectRef();
  const triggerAuthConfig = getTriggerAuthConfig();

  if (!triggerAuthConfig.configured || !triggerProjectRef) {
    return {
      configured: false,
      error: "Trigger.dev auth or project reference is missing.",
      items: [],
      summary: {
        total: 0,
        queued: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
      },
    };
  }

  const limit = Math.max(1, options.limit ?? 25);
  const taskIds = durableJobTaskDefinitions
    .filter((item) => !options.family || item.family === options.family)
    .map((item) => item.taskId);

  const items: DurableJobRun[] = [];
  const authCandidates = [triggerAuthConfig];
  const cliAuthConfig = getTriggerCliAuthConfig();

  if (
    triggerAuthConfig.source === "env" &&
    cliAuthConfig?.configured &&
    cliAuthConfig.accessToken &&
    cliAuthConfig.accessToken !== triggerAuthConfig.accessToken
  ) {
    authCandidates.push(cliAuthConfig);
  }

  let lastError: unknown = null;

  const collectRuns = async (taskIdsForQuery: string[], projectRefForQuery?: string) => {
    const query = { taskIdentifier: taskIdsForQuery };

    if (projectRefForQuery) {
      for await (const run of runs.list(projectRefForQuery, query)) {
        const definition = getTaskDefinition(run.taskIdentifier);
        let errorMessage: string | null = null;

        if (run.isFailed) {
          try {
            const detail = await runs.retrieve(run.id);
            errorMessage = detail.error?.message ?? null;
          } catch {
            errorMessage = "Unable to retrieve the latest Trigger.dev error details for this run.";
          }
        }

        items.push({
          id: run.id,
          family: definition?.family ?? inferFamilyFromTask(run.taskIdentifier),
          taskId: run.taskIdentifier,
          label: definition?.label ?? run.taskIdentifier,
          status: normalizeStatus(run.status),
          createdAt: run.createdAt.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
          startedAt: run.startedAt?.toISOString() ?? null,
          finishedAt: run.finishedAt?.toISOString() ?? null,
          tags: run.tags,
          isSuccess: run.isSuccess,
          isFailed: run.isFailed,
          metadata: run.metadata as Record<string, JsonValue> | undefined,
          errorMessage,
        });

        if (items.length >= limit) {
          break;
        }
      }

      return;
    }

    for await (const run of runs.list(query)) {
      const definition = getTaskDefinition(run.taskIdentifier);
      let errorMessage: string | null = null;

      if (run.isFailed) {
        try {
          const detail = await runs.retrieve(run.id);
          errorMessage = detail.error?.message ?? null;
        } catch {
          errorMessage = "Unable to retrieve the latest Trigger.dev error details for this run.";
        }
      }

      items.push({
        id: run.id,
        family: definition?.family ?? inferFamilyFromTask(run.taskIdentifier),
        taskId: run.taskIdentifier,
        label: definition?.label ?? run.taskIdentifier,
        status: normalizeStatus(run.status),
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
        startedAt: run.startedAt?.toISOString() ?? null,
        finishedAt: run.finishedAt?.toISOString() ?? null,
        tags: run.tags,
        isSuccess: run.isSuccess,
        isFailed: run.isFailed,
        metadata: run.metadata as Record<string, JsonValue> | undefined,
        errorMessage,
      });

      if (items.length >= limit) {
        break;
      }
    }
  };

  for (const authCandidate of authCandidates) {
    try {
      configureTriggerSdkClientWithConfig({
        accessToken: authCandidate.accessToken!,
        apiUrl: authCandidate.apiUrl,
      });

      try {
        await collectRuns(taskIds, triggerProjectRef);
      } catch {
        items.length = 0;
        await collectRuns(taskIds);
      }

      return {
        configured: true,
        error: null,
        items,
        summary: {
          total: items.length,
          queued: items.filter((item) => item.status === "Queued").length,
          running: items.filter((item) => item.status === "Running").length,
          succeeded: items.filter((item) => item.status === "Succeeded").length,
          failed: items.filter((item) => item.status === "Failed").length,
        },
      };
    } catch (error) {
      lastError = error;
      items.length = 0;
      continue;
    }
  }

  return {
    configured: true,
    error: lastError instanceof Error ? lastError.message : "Unable to load Trigger.dev run history.",
    items: [],
    summary: {
      total: 0,
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
    },
  };
}

export function toDurableJobRunsCsv(runsList: DurableJobRun[]) {
  const header = [
    "id",
    "family",
    "task_id",
    "label",
    "status",
    "created_at",
    "updated_at",
    "started_at",
    "finished_at",
    "is_success",
    "is_failed",
    "tags",
    "metadata",
    "error_message",
  ];

  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = runsList.map((item) =>
    [
      item.id,
      item.family,
      item.taskId,
      item.label,
      item.status,
      item.createdAt,
      item.updatedAt,
      item.startedAt ?? "",
      item.finishedAt ?? "",
      String(item.isSuccess),
      String(item.isFailed),
      item.tags.join(" | "),
      JSON.stringify(item.metadata ?? {}),
      item.errorMessage ?? "",
    ]
      .map((value) => escape(value))
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}
