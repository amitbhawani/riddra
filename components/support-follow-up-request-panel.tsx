"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const lanes = ["Onboarding", "Portfolio", "Support", "Billing", "Research", "Bug"] as const;
const channels = ["Email", "WhatsApp", "Phone", "In-app"] as const;
const urgencies = ["Today", "Next business day", "This week"] as const;

export function SupportFollowUpRequestPanel() {
  const router = useRouter();
  const [topic, setTopic] = useState("Need a guided follow-up on account setup and workspace continuity.");
  const [lane, setLane] = useState<(typeof lanes)[number]>("Onboarding");
  const [preferredChannel, setPreferredChannel] = useState<(typeof channels)[number]>("Email");
  const [urgency, setUrgency] = useState<(typeof urgencies)[number]>("Next business day");
  const [note, setNote] = useState("Private-beta support should follow up with concrete next steps and one accountable owner.");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function queueSupportFollowUp() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/support/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          lane,
          preferredChannel,
          urgency,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string; job?: { id?: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to queue support follow-up.");
      }

      setMessage(
        payload.job?.id
          ? `Queued support follow-up job ${payload.job.id}. Final email state will show as sent, failed, or skipped after the worker runs.`
          : "Queued support follow-up in the durable job lane. Final email state will resolve after the worker runs.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue support follow-up.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h3 className="text-lg font-semibold text-white">Queue support follow-up</h3>
      <p className="mt-2 text-sm leading-7 text-mist/72">
        This only queues when the durable worker lane, Resend sender, and support inbox routing are all ready, so support does not imply acknowledgement or follow-up email success without a real provider path.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
          <span>Topic</span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>
        <label className="space-y-2 text-sm text-mist/78">
          <span>Lane</span>
          <select
            value={lane}
            onChange={(event) => setLane(event.target.value as (typeof lanes)[number])}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          >
            {lanes.map((item) => (
              <option key={item} value={item} className="bg-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-mist/78">
          <span>Preferred channel</span>
          <select
            value={preferredChannel}
            onChange={(event) => setPreferredChannel(event.target.value as (typeof channels)[number])}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          >
            {channels.map((item) => (
              <option key={item} value={item} className="bg-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-mist/78">
          <span>Urgency</span>
          <select
            value={urgency}
            onChange={(event) => setUrgency(event.target.value as (typeof urgencies)[number])}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          >
            {urgencies.map((item) => (
              <option key={item} value={item} className="bg-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
          <span>Support note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={queueSupportFollowUp}
          disabled={pending}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Queueing…" : "Queue support follow-up"}
        </button>
        <p className="text-xs leading-6 text-mist/60">
          {message ??
            "Requires Trigger.dev, a configured Resend sender, and support inbox routing. Once accepted, acknowledgement and follow-up email state appears on this page and in the delivery log as queued, sent, failed, or skipped."}
        </p>
      </div>
    </div>
  );
}
