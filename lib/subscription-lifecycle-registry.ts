import type { User } from "@supabase/supabase-js";

import {
  getSubscriptionLifecycleAccountMemory,
  getSubscriptionLifecycleOpsMemory,
} from "@/lib/subscription-lifecycle-memory-store";

export type SubscriptionLifecycleRegistryRow = {
  kind: "account_job" | "account_recovery_action" | "ops_job" | "ops_recovery_action";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

export type SubscriptionLifecycleRegistryScope = "account" | "admin";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getSubscriptionLifecycleRegistryRows(
  user: Pick<User, "id" | "email">,
  scope: SubscriptionLifecycleRegistryScope = "account",
) {
  if (scope === "account") {
    const accountMemory = await getSubscriptionLifecycleAccountMemory(user);

    const accountJobs = accountMemory.jobs.map((job) => ({
      kind: "account_job" as const,
      title: job.title,
      href: "/account/billing/lifecycle",
      status: job.status,
      owner: `${job.triggerEvent} · ${job.accountScope}`,
      note: `${job.nextRun} · ${job.note}`,
    }));

    const accountRecoveryActions = accountMemory.recoveryActions.map((action) => ({
      kind: "account_recovery_action" as const,
      title: action.title,
      href: "/account/billing/recovery",
      status: action.status,
      owner: action.channel,
      note: `${action.dueAt} · ${action.note}`,
    }));

    return [...accountJobs, ...accountRecoveryActions].sort((left, right) => left.title.localeCompare(right.title));
  }

  const opsMemory = await getSubscriptionLifecycleOpsMemory();

  const opsJobs = opsMemory.jobs.map((job) => ({
    kind: "ops_job" as const,
    title: job.title,
    href: "/admin/payment-events",
    status: job.status,
    owner: `${job.triggerEvent} · ${job.accountScope}`,
    note: `${job.nextRun} · ${job.note}`,
  }));

  const opsRecoveryActions = opsMemory.recoveryActions.map((action) => ({
    kind: "ops_recovery_action" as const,
    title: action.title,
    href: "/admin/payment-events",
    status: action.status,
    owner: action.channel,
    note: `${action.dueAt} · ${action.note}`,
  }));

  return [...opsJobs, ...opsRecoveryActions].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getSubscriptionLifecycleRegistrySummary(
  user: Pick<User, "id" | "email">,
  scope: SubscriptionLifecycleRegistryScope = "account",
) {
  if (scope === "account") {
    const accountMemory = await getSubscriptionLifecycleAccountMemory(user);

    return {
      totalRows: accountMemory.jobs.length + accountMemory.recoveryActions.length,
      accountJobs: accountMemory.jobs.length,
      accountRecoveryActions: accountMemory.recoveryActions.length,
      opsJobs: 0,
      opsRecoveryActions: 0,
      supportTouches: accountMemory.summary.supportTouches,
    };
  }

  const opsMemory = await getSubscriptionLifecycleOpsMemory();

  return {
    totalRows: opsMemory.jobs.length + opsMemory.recoveryActions.length,
    accountJobs: 0,
    accountRecoveryActions: 0,
    opsJobs: opsMemory.jobs.length,
    opsRecoveryActions: opsMemory.recoveryActions.length,
    supportTouches: opsMemory.summary.supportTouches,
  };
}

export function toSubscriptionLifecycleRegistryCsv(rows: SubscriptionLifecycleRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
