"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { UserPortfolioHoldingView } from "@/lib/user-product-store";

function getPortfolioFormError(form: {
  stockSlug: string;
  quantity: string;
  buyPrice: string;
}) {
  const stockSlug = form.stockSlug.trim();
  const quantity = Number(form.quantity);
  const buyPrice = Number(form.buyPrice);

  if (!stockSlug) {
    return "Enter a stock symbol or slug.";
  }

  if (!/^[a-z0-9.\-_]+$/i.test(stockSlug)) {
    return "Use a valid stock symbol or slug, such as TATAMOTORS or tata-motors.";
  }

  if (!form.quantity.trim()) {
    return "Enter the quantity you hold.";
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be a number greater than 0.";
  }

  if (!form.buyPrice.trim()) {
    return "Enter your average buy price.";
  }

  if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
    return "Buy price must be a number greater than 0.";
  }

  return null;
}

export function UserPortfolioPanel({
  initialHoldings,
  mode = "full",
}: {
  initialHoldings: UserPortfolioHoldingView[];
  mode?: "full" | "summary";
}) {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [form, setForm] = useState({
    stockSlug: "",
    quantity: "",
    buyPrice: "",
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const investedTotal = holdings.reduce((sum, holding) => sum + holding.investedValue, 0);
  const currentTotal = holdings.reduce(
    (sum, holding) => sum + (holding.currentValue ?? holding.investedValue),
    0,
  );
  const pnlTotal = holdings.reduce((sum, holding) => sum + (holding.pnlValue ?? 0), 0);
  const visibleHoldings = mode === "summary" ? holdings.slice(0, 3) : holdings;
  const remainingCount = Math.max(holdings.length - visibleHoldings.length, 0);
  const formError = getPortfolioFormError(form);
  const shouldShowFormError =
    Boolean(form.stockSlug || form.quantity || form.buyPrice) && Boolean(formError);
  const canSaveHolding = !isPending && !formError;

  function saveHolding() {
    if (formError) {
      setBanner({
        tone: "danger",
        text: formError,
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/portfolio-holdings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockSlug: form.stockSlug.trim(),
          quantity: Number(form.quantity),
          buyPrice: Number(form.buyPrice),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; holdings?: UserPortfolioHoldingView[] }
        | null;

      if (!response.ok || !data?.holdings) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save that holding right now.",
        });
        return;
      }

      setHoldings(data.holdings);
      setForm({ stockSlug: "", quantity: "", buyPrice: "" });
      setEditingSlug(null);
      setBanner({
        tone: "success",
        text: editingSlug
          ? "Holding updated. Your portfolio summary now reflects the new quantity and buy price."
          : "Holding added. Your portfolio summary has been updated.",
      });
    });
  }

  function removeHolding(stockSlug: string) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/portfolio-holdings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stockSlug }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; holdings?: UserPortfolioHoldingView[] }
        | null;

      if (!response.ok || !data?.holdings) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not remove that holding right now.",
        });
        return;
      }

      setHoldings(data.holdings);
      if (editingSlug === stockSlug) {
        setEditingSlug(null);
        setForm({ stockSlug: "", quantity: "", buyPrice: "" });
      }
      setBanner({
        tone: "success",
        text: "Holding removed from your portfolio snapshot.",
      });
    });
  }

  function startEditing(holding: UserPortfolioHoldingView) {
    setEditingSlug(holding.stockSlug);
    setForm({
      stockSlug: holding.stockSlug,
      quantity: String(holding.quantity),
      buyPrice: String(holding.buyPrice),
    });
    setBanner({
      tone: "success",
      text: `Editing ${holding.stockName}. Update quantity or buy price, then save the holding again.`,
    });
  }

  function cancelEditing() {
    setEditingSlug(null);
    setForm({ stockSlug: "", quantity: "", buyPrice: "" });
    setBanner(null);
  }

  function formatCurrency(value: number | null) {
    if (value === null) {
      return "Awaiting quote";
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-4">
      {mode === "full" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryMetric label="Current value" value={holdings.length ? formatCurrency(currentTotal) : "No holdings"} />
          <SummaryMetric label="Invested" value={formatCurrency(investedTotal)} />
          <SummaryMetric
            label="P&L"
            value={holdings.length ? formatCurrency(pnlTotal) : "₹0"}
            tone={pnlTotal >= 0 ? "positive" : "negative"}
          />
        </div>
      ) : null}

      <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#1B3A6B]">
              {editingSlug ? "Edit holding" : mode === "summary" ? "Quick add holding" : "Add holding"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {mode === "summary"
                ? "Add one holding quickly from your dashboard, then use the full portfolio page for deeper review."
                : "Enter a stock slug or symbol, quantity, and average buy price. Save the same stock again later whenever you want to update the position."}
            </p>
          </div>
          <div className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-xs font-medium text-[#1B3A6B]">
            {holdings.length} holdings
          </div>
        </div>

        {mode === "full" ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/portfolio/import" className="font-medium text-[#1B3A6B] underline">
              Import portfolio
            </Link>
            <span className="text-[rgba(75,85,99,0.84)]">
              Use a CSV if you already have your holdings in a sheet or export.
            </span>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <input
            id="portfolio-stock-input"
            value={form.stockSlug}
            onChange={(event) => {
              setForm((current) => ({ ...current, stockSlug: event.target.value }));
              if (banner?.tone === "danger") {
                setBanner(null);
              }
            }}
            placeholder="tata-motors or TATAMOTORS"
            aria-invalid={shouldShowFormError}
            aria-describedby={shouldShowFormError ? "portfolio-form-error" : undefined}
            className="h-11 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          />
          <input
            value={form.quantity}
            onChange={(event) => {
              setForm((current) => ({ ...current, quantity: event.target.value }));
              if (banner?.tone === "danger") {
                setBanner(null);
              }
            }}
            placeholder="Quantity"
            inputMode="decimal"
            aria-invalid={shouldShowFormError}
            aria-describedby={shouldShowFormError ? "portfolio-form-error" : undefined}
            className="h-11 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          />
          <input
            value={form.buyPrice}
            onChange={(event) => {
              setForm((current) => ({ ...current, buyPrice: event.target.value }));
              if (banner?.tone === "danger") {
                setBanner(null);
              }
            }}
            placeholder="Buy price"
            inputMode="decimal"
            aria-invalid={shouldShowFormError}
            aria-describedby={shouldShowFormError ? "portfolio-form-error" : undefined}
            className="h-11 rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveHolding}
              disabled={!canSaveHolding}
              className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingSlug ? "Update" : "Save"}
            </button>
            {editingSlug ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm font-medium text-[#1B3A6B]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
        {shouldShowFormError ? (
          <p id="portfolio-form-error" className="mt-2 text-xs font-medium text-[#b91c1c]">
            {formError}
          </p>
        ) : null}
        {mode === "full" ? (
          <p className="mt-3 text-xs leading-5 text-[rgba(107,114,128,0.88)]">
            Portfolio tracking is a simple personal snapshot. It helps you review position size and P&amp;L quickly, not maintain brokerage-grade records.
          </p>
        ) : null}
      </div>

      {banner ? (
        <div
          className={`rounded-[12px] border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
              : "border-[rgba(248,113,113,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="space-y-3">
        {holdings.length ? (
          <>
            {visibleHoldings.map((holding) => (
            <div
              key={holding.id}
              className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1B3A6B]">{holding.stockName}</p>
                    <p className="mt-1 text-xs text-[rgba(107,114,128,0.88)]">
                      {holding.stockSymbol} • /stocks/{holding.stockSlug}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[rgba(75,85,99,0.84)]">
                      Added {new Date(holding.addedAt).toLocaleDateString()} • Updated {new Date(holding.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-5">
                    <Metric label="Qty" value={String(holding.quantity)} />
                    <Metric label="Buy price" value={formatCurrency(holding.buyPrice)} />
                    <Metric label="Current" value={formatCurrency(holding.currentPrice)} />
                    <Metric label="Value" value={formatCurrency(holding.currentValue)} />
                    <Metric
                      label="P&L"
                      value={formatCurrency(holding.pnlValue)}
                      tone={holding.pnlValue === null ? "neutral" : holding.pnlValue >= 0 ? "positive" : "negative"}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/stocks/${holding.stockSlug}`}
                    className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 text-xs font-medium text-[#1B3A6B]"
                  >
                    Open stock
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEditing(holding)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white px-3 text-xs font-medium text-[#1B3A6B]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHolding(holding.stockSlug)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-3 text-xs font-medium text-[#1B3A6B]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            ))}
            {remainingCount ? (
              <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-4 py-3 text-sm text-[rgba(75,85,99,0.84)]">
                {remainingCount} more {remainingCount === 1 ? "holding is" : "holdings are"} still in your portfolio snapshot.
                <Link href="/portfolio" className="ml-2 font-medium text-[#1B3A6B] underline">
                  Open full portfolio
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-5 py-6">
            <p className="text-sm font-medium text-[#1B3A6B]">No holdings yet</p>
            <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              {mode === "summary"
                ? "Add your first holding above, or open the full portfolio page when you are ready to build a fuller snapshot."
                : "Add your first stock, quantity, and buy price to start a clean personal portfolio snapshot with live value and P&L."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/account/watchlists" className="text-sm font-medium text-[#1B3A6B] underline">
                Open watchlists
              </Link>
              <Link href="/portfolio/import" className="text-sm font-medium text-[#1B3A6B] underline">
                Import portfolio
              </Link>
              <span className="text-sm text-[rgba(75,85,99,0.84)]">Example: 10 shares at 620</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.88)]">{label}</p>
      <p
        className={`mt-1 text-sm font-medium ${
          tone === "positive"
            ? "text-[#166534]"
            : tone === "negative"
              ? "text-[#b91c1c]"
              : "text-[#1B3A6B]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-[14px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4">
      <p className="text-sm text-[rgba(75,85,99,0.84)]">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          tone === "positive"
            ? "text-[#166534]"
            : tone === "negative"
              ? "text-[#b91c1c]"
              : "text-[#1B3A6B]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
