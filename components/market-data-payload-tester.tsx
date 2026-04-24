"use client";

import { useState } from "react";

type ValidationResponse = {
  ok: boolean;
  mode?: string;
  summary?: {
    stockQuotes: number;
    stockCharts: number;
    indexSnapshots: number;
  };
  error?: string;
};

const starterPayload = {
  stockQuotes: [],
  stockCharts: [],
  indexSnapshots: [],
};

type MarketDataPayloadTesterProps = {
  apiBasePath?: string;
};

export function MarketDataPayloadTester({
  apiBasePath = "/api/market-data",
}: MarketDataPayloadTesterProps) {
  const [payload, setPayload] = useState(JSON.stringify(starterPayload, null, 2));
  const [status, setStatus] = useState<string>("Load the sample payload or paste your provider JSON here.");
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<"sample" | "validate" | null>(null);

  async function loadSamplePayload() {
    setLoading("sample");
    setStatus("Loading sample Tata Motors and index payload...");

    try {
      const response = await fetch(`${apiBasePath}/sample-payload`);
      const data = await response.json();

      setPayload(JSON.stringify(data.payload ?? starterPayload, null, 2));
      setResult(null);
      setStatus("Sample payload loaded. You can validate it as-is or replace it with your provider JSON.");
    } catch {
      setStatus("Unable to load the sample payload right now.");
    } finally {
      setLoading(null);
    }
  }

  async function validatePayload() {
    setLoading("validate");
    setStatus("Validating payload structure...");

    try {
      const parsed = JSON.parse(payload);
      const response = await fetch(`${apiBasePath}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed),
      });
      const data = (await response.json()) as ValidationResponse;

      setResult(data);
      setStatus(
        data.ok
          ? "Payload shape is valid for the verified ingestion layer."
          : data.error ?? "Validation failed.",
      );
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? error.message : "Validation failed before the API call.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={loadSamplePayload}
          disabled={loading !== null}
          className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "sample" ? "Loading sample..." : "Load sample payload"}
        </button>
        <button
          type="button"
          onClick={validatePayload}
          disabled={loading !== null}
          className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "validate" ? "Validating..." : "Validate payload"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
        <p className="text-sm font-semibold text-white">Operator status</p>
        <p className="mt-2 text-sm leading-7 text-mist/74">{status}</p>
        {result?.ok && result.summary ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
              Stock quotes: <span className="text-white">{result.summary.stockQuotes}</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
              Stock charts: <span className="text-white">{result.summary.stockCharts}</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
              Index snapshots: <span className="text-white">{result.summary.indexSnapshots}</span>
            </div>
          </div>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-white">Payload JSON</span>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          spellCheck={false}
          className="mt-3 min-h-[420px] w-full rounded-[24px] border border-white/10 bg-black/25 px-4 py-4 font-mono text-sm leading-7 text-mist/80 outline-none transition focus:border-emerald-300/35"
        />
      </label>
    </div>
  );
}
