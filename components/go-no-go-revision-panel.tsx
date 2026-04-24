"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const revisionStates = ["Published", "Review ready", "Rollback staged"] as const;

type GoNoGoRevisionPanelProps = {
  recommendation: string;
  recommendedMode: string;
  reasons: string[];
};

function getDefaultRevisionState(recommendation: string): (typeof revisionStates)[number] {
  if (recommendation.toLowerCase().includes("full launch")) return "Published";
  if (recommendation.toLowerCase().includes("public beta")) return "Review ready";
  return "Rollback staged";
}

export function GoNoGoRevisionPanel({ recommendation, recommendedMode, reasons }: GoNoGoRevisionPanelProps) {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState(reasons[0] ?? "");
  const [editor, setEditor] = useState("Go No-Go Operator");
  const [action, setAction] = useState("Logged final launch-call mutation from go / no-go");
  const [changedFields, setChangedFields] = useState("recommendation, recommended_mode, rationale");
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [revisionState, setRevisionState] = useState<(typeof revisionStates)[number]>(
    getDefaultRevisionState(recommendation),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function syncFromSelection(nextReason: string) {
    setSelectedReason(nextReason);
    setReason(nextReason);
    setMessage(null);
  }

  async function saveRevision() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: `Go / no-go: ${recommendation}`,
          assetType: "launch go-no-go call",
          editor,
          action,
          changedFields,
          reason,
          revisionState,
          routeTarget: "/admin/go-no-go",
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record go-no-go revision.");
      }

      setMessage("Saved a write-through go / no-go revision row.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record go-no-go revision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Write-through final call</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Log go / no-go changes into the shared revision lane so the final launch call stops living only as a compressed decision page.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-mist/78">
            <span>Recommendation</span>
            <input
              value={recommendation}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Recommended mode</span>
            <input
              value={recommendedMode}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Reason lane</span>
            <select
              value={selectedReason}
              onChange={(event) => syncFromSelection(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {reasons.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Operator</span>
            <input
              value={editor}
              onChange={(event) => setEditor(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Revision state</span>
            <select
              value={revisionState}
              onChange={(event) => setRevisionState(event.target.value as (typeof revisionStates)[number])}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            >
              {revisionStates.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-mist/78">
            <span>Related surface</span>
            <input
              value="/admin/go-no-go"
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/75 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Action</span>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Changed fields</span>
            <input
              value={changedFields}
              onChange={(event) => setChangedFields(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
          <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
            <span>Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveRevision}
            disabled={pending}
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Write final-call revision"}
          </button>
          <p className="text-xs leading-6 text-mist/60">
            {message ?? "Appends a real revision row from go / no-go instead of leaving launch-call changes as summary-only decision prose."}
          </p>
        </div>
      </div>
    </div>
  );
}
