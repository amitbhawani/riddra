import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { SourceEntryConsoleClient } from "@/components/source-entry-console-client";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  sourceEntryConsoleLanes,
  sourceEntryConsoleRules,
  sourceEntryConsoleSummary,
} from "@/lib/source-entry-console";

export const metadata: Metadata = {
  title: "Source Entry Console",
  description: "Protected source-entry console for index rosters, stock closes, mutual-fund NAV, fund factsheet evidence, stock OHLCV, commodity history, and public-route overrides.",
};

export default async function SourceEntryConsolePage() {
  await requireAdmin();
  const readinessItems = sourceEntryConsoleLanes.map((lane) => ({
    label: lane.title,
    status: lane.status,
    detail: lane.summary,
    routeTarget: lane.routes[0] ?? "/admin/source-entry-console",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Source Entry Console", href: "/admin/source-entry-console" },
            ]}
          />
          <Eyebrow>Operator desk</Eyebrow>
          <SectionHeading
            title="Source entry console"
            description="This page gives operators a visual handoff for the routes that still need manual source-backed cleanup, especially index rosters, stock closes, mutual-fund NAV rows, fund factsheet evidence, stock OHLCV, metals history, and launch-critical overrides."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Live entry lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceEntryConsoleSummary.liveForms}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Source families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceEntryConsoleSummary.sourceFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Current priority</p>
            <p className="mt-2 text-lg font-semibold text-white">{sourceEntryConsoleSummary.currentPriority}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="source entry lane"
            panelTitle="Write-through source-entry action"
            panelDescription="Log manual source-entry and override posture into the shared revision lane so this console stops living only as a form handoff."
            defaultRouteTarget="/admin/source-entry-console"
            defaultOperator="Source Entry Operator"
            defaultChangedFields="manual_source, route_truth, override_posture"
            actionNoun="source-entry mutation"
          />
        </GlowCard>

        <div className="grid gap-6">
          {sourceEntryConsoleLanes.map((lane) => (
            <GlowCard key={lane.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{lane.owner}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{lane.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{lane.summary}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                  {lane.status}
                </div>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <h3 className="text-base font-semibold text-white">Expected fields</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lane.fields.map((field) => (
                      <div
                        key={field}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-mist/78"
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <h3 className="text-base font-semibold text-white">Target routes</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lane.routes.map((route) => (
                      <div
                        key={route}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-mist/78"
                      >
                        {route}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Console rules</h2>
          <div className="mt-5 grid gap-3">
            {sourceEntryConsoleRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <SourceEntryConsoleClient />
      </Container>
    </div>
  );
}
