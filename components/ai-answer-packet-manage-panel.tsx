"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AiAnswerPacketManagePanelProps = {
  items: Array<{
    workflow: string;
    audience: string;
    continuityState: string;
  }>;
};

export function AiAnswerPacketManagePanel({ items }: AiAnswerPacketManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState<string | null>(null);

  async function removePacket(workflow: string) {
    setPendingWorkflow(workflow);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-answer-packets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove AI answer packet.");
      }

      setMessage(`Removed ${workflow} from the answer-packet lane.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove AI answer packet.");
    } finally {
      setPendingWorkflow(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manage answer packets</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">
            Remove stale stored or preview packets from the shared AI memory lane so continuity rows stay intentionally curated.
          </p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.workflow} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{item.workflow}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {item.audience} · {item.continuityState}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePacket(item.workflow)}
                disabled={pendingWorkflow === item.workflow}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingWorkflow === item.workflow ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">{message ?? "Keeps the answer-packet lane from staying append-only after create and update flows."}</p>
      </div>
    </div>
  );
}
