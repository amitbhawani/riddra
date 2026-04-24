"use client";

import { useState } from "react";

const topics = ["Support", "Partnership", "Media", "Creator collaboration", "Bug report", "General question"] as const;

export function ContactRequestPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]>("Support");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitRequest() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/contact/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string; job?: { id?: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit the contact request.");
      }

      setMessage(
        payload.job?.id
          ? `Your message was queued and email delivery job ${payload.job.id} is running now. Final acknowledgement state will resolve to sent, failed, or skipped after the worker runs.`
          : "Your message was queued and the email delivery lane is running now. Final delivery state will resolve after the worker runs.",
      );
      setNote("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit the contact request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
      <h2 className="text-xl font-semibold text-white">Send a real contact request</h2>
      <p className="mt-3 text-sm leading-7 text-mist/74">
        This public form only succeeds when Trigger.dev, a live Resend sender, and a configured support inbox are all ready. It does not pretend a contact acknowledgement was sent if provider delivery or inbox routing is unavailable.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-mist/78">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>
        <label className="space-y-2 text-sm text-mist/78">
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>
        <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
          <span>Topic</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value as (typeof topics)[number])}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          >
            {topics.map((item) => (
              <option key={item} value={item} className="bg-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-mist/78 md:col-span-2">
          <span>Message</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[144px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/20"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submitRequest}
          disabled={pending}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send contact request"}
        </button>
        <p className="text-xs leading-6 text-mist/60">
          {message ??
            "Requires a live Trigger-backed delivery lane, a configured Resend sender, and support inbox routing. Once accepted, acknowledgement and inbox state appear as queued, sent, failed, or skipped."}
        </p>
      </div>
    </div>
  );
}
