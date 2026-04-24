"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LifecycleJobManagePanelProps = {
  jobs: Array<{
    id: string;
    title: string;
    triggerEvent: string;
    status: string;
  }>;
  endpoint: string;
  title: string;
  description: string;
};

export function LifecycleJobManagePanel({
  jobs,
  endpoint,
  title,
  description,
}: LifecycleJobManagePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function removeJob(id: string, jobTitle: string) {
    setPendingId(id);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove lifecycle job.");
      }

      setMessage(`Removed ${jobTitle} from the lifecycle backend queue.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove lifecycle job.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-mist/72">{description}</p>
        </div>
        <div className="grid gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{job.title}</p>
                <p className="mt-1 text-xs text-mist/60">
                  {job.triggerEvent} · {job.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeJob(job.id, job.title)}
                disabled={pendingId === job.id}
                className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingId === job.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-6 text-mist/60">
          {message ?? "Keeps the lifecycle queue from staying append-only after create and update flows."}
        </p>
      </div>
    </div>
  );
}
