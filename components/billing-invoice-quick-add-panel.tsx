"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BillingInvoiceQuickAddPanelProps = {
  actionLabel?: string;
  description?: string;
  endpoint?: string;
  initialPlanName: string;
  title?: string;
};

const invoiceStatuses = ["Paid", "Failed", "Upcoming"] as const;

export function BillingInvoiceQuickAddPanel({
  actionLabel = "Save invoice row",
  description = "This now writes a new invoice snapshot into the shared billing-memory store instead of only describing the lane in tracker text.",
  endpoint = "/api/account/billing/invoices",
  initialPlanName,
  title = "Write preview invoice row",
}: BillingInvoiceQuickAddPanelProps) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState("");
  const [planName, setPlanName] = useState(initialPlanName);
  const [amount, setAmount] = useState("Rs. 999");
  const [status, setStatus] = useState<(typeof invoiceStatuses)[number]>("Paid");
  const [note, setNote] = useState("Preview invoice row added for billing-lane persistence testing.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveInvoice() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          planName,
          amount,
          status,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save invoice row.");
      }

      setMessage("Saved into the billing-memory store and refreshed the workspace.");
      setInvoiceId("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save invoice row.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Invoice id</span>
            <input
              value={invoiceId}
              onChange={(event) => setInvoiceId(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
              placeholder="inv_riddra_1204"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Plan name</span>
            <input
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
              placeholder="Rs. 499"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof invoiceStatuses)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {invoiceStatuses.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Operator note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveInvoice}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : actionLabel}
          </button>
          <p className="text-xs leading-6 text-mist/60">{message ?? "Writes into the same file-backed lane used by billing pages and admin ledger surfaces."}</p>
        </div>
      </div>
    </div>
  );
}
