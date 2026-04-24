import type { User } from "@supabase/supabase-js";

import { getAccountBillingMemory, getBillingLedgerMemory } from "@/lib/billing-ledger-memory-store";

export type BillingLedgerRegistryRow = {
  kind: "invoice" | "ledger" | "event";
  title: string;
  href: string;
  status: string;
  owner: string;
  note: string;
};

export type BillingLedgerRegistryScope = "account" | "admin";

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

export async function getBillingLedgerRegistryRows(
  user?: Pick<User, "id" | "email">,
  scope: BillingLedgerRegistryScope = user ? "account" : "admin",
): Promise<BillingLedgerRegistryRow[]> {
  if (scope === "account") {
    if (!user) {
      throw new Error("A signed-in user is required for the account billing registry.");
    }

    const normalizedUser = normalizeRegistryUser(user);
    const memory = await getAccountBillingMemory(user);

    const invoiceRows = memory.invoices.map((row) => ({
      kind: "invoice" as const,
      title: row.invoiceId,
      href: "/account/billing",
      status: row.status,
      owner: row.planName,
      note: `${row.amount} · billed ${row.billedAt} · ${row.note}`,
    }));

    const eventRows = memory.relatedEvents
      .filter((row) => {
        const rowUser = row.userRef.toLowerCase().trim();
        return rowUser === normalizedUser.email || rowUser === memory.email.toLowerCase().trim() || rowUser === normalizedUser.fallbackKey;
      })
      .map((row) => ({
        kind: "event" as const,
        title: row.event,
        href: "/account/billing",
        status: row.status,
        owner: row.subject,
        note: `${row.occurredAt} · ${row.note}`,
      }));

    return [...invoiceRows, ...eventRows].sort((left, right) => left.title.localeCompare(right.title));
  }

  const memory = await getBillingLedgerMemory();

  const ledgerRows = memory.ledgerRows.map((row) => ({
    kind: "ledger" as const,
    title: row.userRef,
    href: "/admin/billing-ledger",
    status: `${row.status} · ${row.renewalState}`,
    owner: row.planName,
    note: `Latest invoice ${row.latestInvoice} · ${row.note}`,
  }));

  const eventRows = memory.eventRows.map((row) => ({
    kind: "event" as const,
    title: row.event,
    href: "/admin/payment-events",
    status: row.status,
    owner: row.userRef,
    note: `${row.subject} · ${row.occurredAt} · ${row.note}`,
  }));

  return [...ledgerRows, ...eventRows].sort((left, right) => left.title.localeCompare(right.title));
}

export async function getBillingLedgerRegistrySummary(
  user?: Pick<User, "id" | "email">,
  scope: BillingLedgerRegistryScope = user ? "account" : "admin",
) {
  const rows = await getBillingLedgerRegistryRows(user, scope);

  return {
    totalRows: rows.length,
    invoiceRows: rows.filter((row) => row.kind === "invoice").length,
    ledgerRows: rows.filter((row) => row.kind === "ledger").length,
    eventRows: rows.filter((row) => row.kind === "event").length,
    paidRows: rows.filter((row) => row.status.includes("Paid") || row.status.includes("Processed")).length,
    followUpRows: rows.filter(
      (row) =>
        row.status.includes("Failed") ||
        row.status.includes("Grace") ||
        row.status.includes("Needs review") ||
        row.status.includes("Pending"),
    ).length,
  };
}

export function toBillingLedgerRegistryCsv(rows: BillingLedgerRegistryRow[]) {
  const header = ["kind", "title", "href", "status", "owner", "note"];
  const lines = rows.map((row) =>
    [row.kind, row.title, row.href, row.status, row.owner, row.note]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
