import { logger, task } from "@trigger.dev/sdk/v3";

import { applyBrokerSyncExecution } from "@/lib/broker-sync-memory-store";

export const brokerSyncExecutionTask = task({
  id: "broker-sync-execution",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 8_000,
    randomize: false,
  },
  run: async (payload: {
    user: {
      id: string;
      email: string;
    };
    broker: string;
    accountScope: string;
    nextWindow: string;
    trigger: string;
    note: string;
    source: string;
  }) => {
    logger.info("Starting broker-sync execution task", payload);

    const memory = await applyBrokerSyncExecution(payload.user, {
      broker: payload.broker,
      accountScope: payload.accountScope,
      nextWindow: payload.nextWindow,
      trigger: payload.trigger,
      note: payload.note,
      executionState: "Reviewing",
    });

    logger.info("Completed broker-sync execution task", {
      broker: payload.broker,
      accountScope: payload.accountScope,
      reviewQueue: memory.summary.reviewQueue,
      linkedAccounts: memory.summary.linkedAccounts,
      activityEntries: memory.summary.activityEntries,
    });

    return {
      broker: payload.broker,
      accountScope: payload.accountScope,
      source: payload.source,
      summary: memory.summary,
      updatedAt: memory.updatedAt,
    };
  },
});
