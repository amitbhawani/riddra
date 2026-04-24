import Link from "next/link";
import type { Metadata } from "next";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ToolsExplorer } from "@/components/tools-explorer";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free Tools",
  description: "Riddra tool hub with investing calculators, market trackers, PDF utilities, and practical everyday workflows.",
};

export default function ToolsPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Activation layer</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">Tools</h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            Use investing calculators, live commodity trackers, and practical utility tools to move from quick answers into deeper workflows without leaving the platform.
          </p>
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Tools truth"
          title="The tools hub is useful right now, but saved continuity and subscriber follow-through still depend on launch activation"
          description="Use tools confidently for public value, while keeping auth continuity, premium workflow promises, and support follow-through honest until all live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry tool usage into saved account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full tools-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium tool continuity can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium workflow promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for tool-driven onboarding and recovery questions."
          supportPending="Support delivery is still not fully active, so the tools layer should keep support expectations conservative."
          href="/pricing"
          hrefLabel="Open pricing"
        />

        <ToolsExplorer />

        <div className="grid gap-6">
          {tools.map((tool) => (
            <Link key={tool.slug} href={`/tools/${tool.slug}`}>
              <GlowCard className="transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-mist/60">
                      <span>{tool.category}</span>
                      <span>{tool.access}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{tool.title}</h2>
                    <p className="max-w-3xl text-sm leading-7 text-mist/74">{tool.summary}</p>
                  </div>
                  <div className="grid min-w-[260px] gap-3">
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">What it helps with</p>
                      <p className="mt-2 text-sm font-semibold text-white">{tool.outcome}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Typical input</p>
                      <p className="mt-2 text-sm font-semibold text-white">{tool.inputLabel}</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
