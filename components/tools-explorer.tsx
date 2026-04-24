"use client";

import { useState } from "react";

import { ToolCalculatorPanel } from "@/components/tool-calculator-panel";
import { GlowCard } from "@/components/ui";

type FeaturedTool = {
  slug: string;
  title: string;
  category: string;
  note: string;
};

const featuredTools: FeaturedTool[] = [
  {
    slug: "position-size-calculator",
    title: "Position Size",
    category: "Trading utility",
    note: "Calculate risk-based position size before a trade.",
  },
  {
    slug: "ipo-lot-calculator",
    title: "IPO Lots",
    category: "IPO utility",
    note: "Work out lot count, share count, and application amount quickly.",
  },
  {
    slug: "sip-goal-planner",
    title: "SIP Goal",
    category: "Wealth utility",
    note: "Estimate the monthly SIP needed for a long-term goal.",
  },
  {
    slug: "breakout-checklist",
    title: "Breakout Check",
    category: "Trading utility",
    note: "Score a breakout setup before moving into charts or alerts.",
  },
];

export function ToolsExplorer() {
  const [activeSlug, setActiveSlug] = useState<string>(featuredTools[0]?.slug ?? "position-size-calculator");
  const activeTool = featuredTools.find((tool) => tool.slug === activeSlug) ?? featuredTools[0];

  return (
    <GlowCard>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-white">Try the strongest tools right here</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            The highest-intent tools now work directly on the hub, so users can get value before deciding whether they need a deeper route or an account-linked workflow.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/62">
          Interactive hub
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        {featuredTools.map((tool) => {
          const isActive = tool.slug === activeSlug;

          return (
            <button
              key={tool.slug}
              type="button"
              onClick={() => setActiveSlug(tool.slug)}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                isActive
                  ? "border-aurora/40 bg-aurora/10"
                  : "border-white/8 bg-black/15 hover:border-white/16 hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-mist/58">{tool.category}</p>
              <p className="mt-2 text-base font-semibold text-white">{tool.title}</p>
              <p className="mt-2 text-sm leading-6 text-mist/72">{tool.note}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-[28px] border border-white/8 bg-black/15 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-mist/58">{activeTool.category}</p>
            <p className="mt-2 text-xl font-semibold text-white">{activeTool.title}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/62">
            Hub preview
          </div>
        </div>
        <ToolCalculatorPanel slug={activeTool.slug} />
      </div>
    </GlowCard>
  );
}
