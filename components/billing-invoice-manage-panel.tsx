"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BillingInvoiceManagePanelProps = {
  description?: string;
  emptyMessage?: string;
  endpoint?: string;
  invoices: Array<{
    invoiceId: string;
    planName: string;
    amount: string;
    status: string;
    billedAt: string;
  }>;
  title?: string;
};

export function BillingInvoiceManagePanel({
  description = "This now lets the subscriber workspace archive preview invoice rows instead of only appending new ones into the billing-memory store.",
  emptyMessage = "This now removes preview invoice rows from the shared billing-memory store.",
  endpoint = "/api/account/billing/invoices",
  invoices,
  title = "Manage preview invoice rows",
}: BillingInvoiceManagePanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function archiveInvoice(invoiceId: string) {
    setStatus("Archiving preview invoice...");

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Unable to archive invoice.");
      return;
    }

    setStatus(`Archived ${invoiceId} from the preview billing store.`);
    router.refresh();
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
      <div className="mt-4 grid gap-3">
        {invoices.map((invoice) => (
          <div key={invoice.invoiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{invoice.invoiceId}</p>
              <p className="mt-1 text-xs text-mist/60">
                {invoice.planName} · {invoice.amount} · {invoice.status} · {invoice.billedAt}
              </p>
            </div>
            <button
              type="button"
              onClick={() => archiveInvoice(invoice.invoiceId)}
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Archive row
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-6 text-mist/55">{status ?? emptyMessage}</p>
    </div>
  );
}
