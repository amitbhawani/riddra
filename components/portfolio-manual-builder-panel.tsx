"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ManualPortfolioField = {
  label: string;
  placeholder: string;
  note: string;
};

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

export function PortfolioManualBuilderPanel({
  fields,
  initialDraft,
}: {
  fields: ManualPortfolioField[];
  initialDraft: {
    symbol: string;
    quantity: string;
    avgCost: string;
    portfolioTag: string;
  };
}) {
  const router = useRouter();
  const [symbol, setSymbol] = useState(initialDraft.symbol);
  const [quantity, setQuantity] = useState(initialDraft.quantity);
  const [avgCost, setAvgCost] = useState(initialDraft.avgCost);
  const [portfolioTag, setPortfolioTag] = useState(initialDraft.portfolioTag);
  const [currentPrice, setCurrentPrice] = useState("1032");
  const [status, setStatus] = useState<string | null>(null);

  const result = useMemo(() => {
    const quantityValue = Number(quantity);
    const avgCostValue = Number(avgCost);
    const currentPriceValue = Number(currentPrice);

    if (!quantityValue || !avgCostValue || !currentPriceValue) {
      return null;
    }

    const invested = quantityValue * avgCostValue;
    const marketValue = quantityValue * currentPriceValue;
    const pnl = marketValue - invested;

    return {
      invested,
      marketValue,
      pnl,
    };
  }, [quantity, avgCost, currentPrice]);

  function storageLabel(storageMode?: string | null) {
    return storageMode === "supabase_private_beta"
      ? "shared private-beta portfolio lane"
      : "fallback portfolio store";
  }

  async function saveDraft() {
    setStatus("Saving draft...");

    const response = await fetch("/api/portfolio/manual-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        quantity,
        avgCost,
        portfolioTag,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          storageMode?: string;
          summary?: { holdings?: number };
        }
      | null;

    if (!response.ok) {
      setStatus(payload?.error ?? "Unable to save manual draft.");
      return;
    }

    const holdingsCount = payload?.summary?.holdings ?? 0;
    setStatus(
      holdingsCount > 0
        ? `Manual holding saved to the ${storageLabel(payload?.storageMode)}. Quote-aware valuation appears automatically when a durable stock quote exists.`
        : `Manual portfolio draft saved to the ${storageLabel(payload?.storageMode)}.`,
    );
    router.refresh();
  }

  async function clearDraft() {
    setStatus("Clearing draft...");

    const response = await fetch("/api/portfolio/manual-draft", {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          storageMode?: string;
        }
      | null;

    if (!response.ok) {
      setStatus(payload?.error ?? "Unable to clear manual draft.");
      return;
    }

    setSymbol("");
    setQuantity("");
    setAvgCost("");
    setPortfolioTag("");
    setStatus(`Manual draft cleared from the ${storageLabel(payload?.storageMode)}. Any saved holdings snapshot stays unchanged.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const lower = field.label.toLowerCase();
          const value =
            lower.includes("symbol")
              ? symbol
              : lower.includes("quantity")
                ? quantity
                : lower.includes("average")
                  ? avgCost
                  : portfolioTag;
          const setter =
            lower.includes("symbol")
              ? setSymbol
              : lower.includes("quantity")
                ? setQuantity
                : lower.includes("average")
                  ? setAvgCost
                  : setPortfolioTag;

          return (
            <label key={field.label} className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
              <p className="text-sm font-medium text-[#1B3A6B]">{field.label}</p>
              <input
                value={value}
                onChange={(event) => setter(event.target.value)}
                className="mt-3 w-full rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]"
                placeholder={field.placeholder}
              />
              <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{field.note}</p>
            </label>
          );
        })}
      </div>

      <label className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
        <p className="text-sm font-medium text-[#1B3A6B]">Current price for preview math</p>
        <input
          value={currentPrice}
          onChange={(event) => setCurrentPrice(event.target.value)}
          className="mt-3 w-full rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          placeholder="1032"
        />
        <p className="mt-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
          This supports the local P&amp;L estimate only. Saved draft state stores symbol, quantity, average cost, and portfolio tag.
        </p>
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
          <p className="text-sm text-[rgba(107,114,128,0.88)]">Invested value</p>
          <p className="mt-2 text-lg font-semibold text-[#1B3A6B]">{result ? formatInr(result.invested) : "Pending"}</p>
        </div>
        <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
          <p className="text-sm text-[rgba(107,114,128,0.88)]">Market value</p>
          <p className="mt-2 text-lg font-semibold text-[#1B3A6B]">{result ? formatInr(result.marketValue) : "Pending"}</p>
        </div>
        <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
          <p className="text-sm text-[rgba(107,114,128,0.88)]">Unrealized P&amp;L</p>
          <p className={`mt-2 text-lg font-semibold ${result && result.pnl >= 0 ? "text-aurora" : "text-white"}`}>
            {result ? formatInr(result.pnl) : "Pending"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-[rgba(107,114,128,0.8)]">
          {status ?? "This now writes the draft into the account-specific portfolio lane and materializes a holdings snapshot once the entry is valid."}
        </p>
        <button
          type="button"
          onClick={saveDraft}
          className="rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264a83]"
        >
          Save manual draft
        </button>
        <button
          type="button"
          onClick={clearDraft}
          className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]"
        >
          Clear draft
        </button>
      </div>
    </div>
  );
}
