import { logger, task } from "@trigger.dev/sdk/v3";

import { confirmPortfolioReconciliation } from "@/lib/portfolio-memory-store";

type DurableUserIdentity = {
  id: string;
  email: string;
};

export const portfolioReconciliationCheckpointTask = task({
  id: "portfolio-reconciliation-checkpoint",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 8_000,
    randomize: false,
  },
  run: async (payload: {
    user: DurableUserIdentity;
    fileName: string;
    createdAt: string;
    note: string;
  }) => {
    logger.info("Starting portfolio reconciliation checkpoint task", {
      email: payload.user.email,
      fileName: payload.fileName,
      createdAt: payload.createdAt,
    });

    const portfolio = await confirmPortfolioReconciliation(payload.user, {
      fileName: payload.fileName,
      createdAt: payload.createdAt,
      note: payload.note,
    });

    logger.info("Completed portfolio reconciliation checkpoint task", {
      email: payload.user.email,
      fileName: payload.fileName,
      reconciliations: portfolio.reconciliations.length,
    });

    return {
      updatedAt: portfolio.updatedAt,
      reconciliations: portfolio.reconciliations.length,
      importRuns: portfolio.importRuns.length,
      summary: portfolio.summary,
    };
  },
});
