import type { User } from "@supabase/supabase-js";

import { getEntitlementSyncMemory } from "@/lib/entitlement-sync-memory-store";

export type EntitlementSyncRegistryRow = {
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

function normalizeRegistryUser(user: Pick<User, "id" | "email">) {
  return {
    email: user.email?.toLowerCase().trim(),
    fallbackKey: user.id.trim(),
  };
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function getEntitlementSyncRegistryRows(
  user?: Pick<User, "id" | "email">,
): Promise<EntitlementSyncRegistryRow[]> {
  const memory = await getEntitlementSyncMemory();
  const scopedUser = user ? normalizeRegistryUser(user) : null;

  return memory.historyRows
    .filter((row) => {
      if (!scopedUser) return true;
      const rowUser = row.userRef.toLowerCase().trim();
      return rowUser === scopedUser.email || rowUser === scopedUser.fallbackKey;
    })
    .map((row) => ({
      title: row.userRef,
      href: scopedUser ? "/account/access/entitlements" : "/admin/entitlements",
      status: `${row.syncState} · ${row.nextLevel}`,
      owner: `${row.actorType} · ${row.actorRef}`,
      note: `${row.featureCode} · ${row.reason} · ${row.changedAt}`,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function getEntitlementSyncRegistrySummary(user?: Pick<User, "id" | "email">) {
  const rows = await getEntitlementSyncRegistryRows(user);

  return {
    totalRows: rows.length,
    syncedRows: rows.filter((row) => row.status.includes("Synced")).length,
    reviewRows: rows.filter((row) => row.status.includes("Needs review")).length,
    automatedRows: rows.filter((row) => row.owner.startsWith("system ·")).length,
  };
}

export function toEntitlementSyncRegistryCsv(rows: EntitlementSyncRegistryRow[]) {
  const header = ["title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.title, row.href, row.status, row.owner, row.note].map((value) => escapeCsv(value)).join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
