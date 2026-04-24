"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortfolioImportRunPanel() {
  const router = useRouter();
  const [sourceLabel, setSourceLabel] = useState("NSE holdings export");
  const [fileName, setFileName] = useState("holdings-import-apr.csv");
  const [importedRows, setImportedRows] = useState("12");
  const [unresolvedRows, setUnresolvedRows] = useState("2");
  const [status, setStatus] = useState<"Reviewed" | "Needs action" | "Ready to save">("Needs action");
  const [message, setMessage] = useState<string | null>(null);

  async function submitImportRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving import run...");

    const response = await fetch("/api/portfolio/import-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLabel,
        fileName,
        importedRows: Number(importedRows),
        unresolvedRows: Number(unresolvedRows),
        status,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Unable to save import run.");
      return;
    }

    setMessage("Import run written to the persisted portfolio store.");
    setFileName("holdings-import-apr.csv");
    setImportedRows("12");
    setUnresolvedRows("2");
    setStatus("Needs action");
    router.refresh();
  }

  return (
    <form onSubmit={submitImportRun} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-base font-semibold text-white">Record import run</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">
        Save a new import-run row into the portfolio memory store before or after reconciliation work begins.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)}
          placeholder="NSE holdings export"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
        <input
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          placeholder="holdings-import-apr.csv"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={importedRows}
            onChange={(event) => setImportedRows(event.target.value)}
            placeholder="12"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
          />
          <input
            value={unresolvedRows}
            onChange={(event) => setUnresolvedRows(event.target.value)}
            placeholder="2"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-mist/40"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "Reviewed" | "Needs action" | "Ready to save")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
        >
          <option value="Needs action">Needs action</option>
          <option value="Ready to save">Ready to save</option>
          <option value="Reviewed">Reviewed</option>
        </select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-mist/55">
          {message ?? "This now creates a durable import-run row and appends portfolio activity history."}
        </p>
        <button
          type="submit"
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Save import run
        </button>
      </div>
    </form>
  );
}
