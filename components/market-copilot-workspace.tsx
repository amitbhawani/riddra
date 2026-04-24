"use client";

import Link from "next/link";
import { useState } from "react";

import type { MarketCopilotPlaybook } from "@/lib/market-copilot";

export function MarketCopilotWorkspace({
  playbooks,
}: {
  playbooks: MarketCopilotPlaybook[];
}) {
  const [selectedSlug, setSelectedSlug] = useState(playbooks[0]?.slug ?? "");
  const selected =
    playbooks.find((playbook) => playbook.slug === selectedSlug) ?? playbooks[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        {playbooks.map((playbook) => {
          const isActive = playbook.slug === selected.slug;

          return (
            <button
              key={playbook.slug}
              type="button"
              onClick={() => setSelectedSlug(playbook.slug)}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                isActive
                  ? "border-aurora/50 bg-aurora/10"
                  : "border-white/8 bg-black/15 hover:border-white/18 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
                    {playbook.audience}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {playbook.title}
                  </h3>
                </div>
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                  Playbook
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-mist/74">{playbook.goal}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
                {selected.audience}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {selected.title}
              </h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
              Formula-first
            </span>
          </div>
          <p className="text-sm leading-7 text-mist/74">{selected.goal}</p>
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
              Sample ask
            </p>
            <p className="mt-3 text-sm leading-7 text-white">{selected.sampleAsk}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
              Answer shape
            </p>
            <p className="mt-3 text-sm leading-7 text-mist/76">
              {selected.answerShape}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
              Checks first
            </p>
            <div className="mt-4 grid gap-3">
              {selected.checks.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
              What the user gets
            </p>
            <div className="mt-4 grid gap-3">
              {selected.outputs.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-mist/58">
            Best next moves
          </p>
          <div className="mt-4 grid gap-3">
            {selected.routeHandoffs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-white/8 bg-black/15 px-4 py-4 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-mist/58">
                    Open page
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mist/52">
                  {item.href}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
