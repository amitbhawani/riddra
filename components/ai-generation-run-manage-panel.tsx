"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AiGenerationRunManagePanelProps = {
  items: Array<{
    workflow: string;
    mode: string;
    answerState: string;
  }>;
};

export function AiGenerationRunManagePanel({ items }: AiGenerationRunManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState<string | null>(null);

  async function removeRun(workflow: string) {
    setPendingWorkflow(workflow);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-generation-runs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove AI generation run.");
      }

      setMessage(`Removed ${workflow} from the generation-run lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove AI generation run.");
    } finally {
      setPendingWorkflow(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage generation runs</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale generation workflows from the shared AI memory lane so operational AI runs do not accumulate as append-only preview rows.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.workflow} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{item.workflow}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.mode} · {item.answerState}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeRun(item.workflow)}
                disabled={pendingWorkflow === item.workflow}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingWorkflow === item.workflow ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">{message ?? "Keeps the generation-run lane from staying append-only after create and update flows."}</p>
      </div>
    </div>
  );
}
