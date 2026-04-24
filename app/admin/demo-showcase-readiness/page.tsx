import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { demoShowcaseReadiness } from "@/lib/demo-showcase-readiness";

export const metadata: Metadata = {
  title: "Demo Showcase Readiness",
  description:
    "Protected checklist for tomorrow's showcase routes, landing-page polish, and the most important walkthrough surfaces.",
};

function tone(status: string) {
  if (status === "Ready now") return "bg-bloom/12 text-bloom";
  if (status === "In progress") return "bg-flare/12 text-flare";
  return "bg-white/10 text-white";
}

export default async function AdminDemoShowcaseReadinessPage() {
  await requireUser();

  const readyCount = demoShowcaseReadiness.filter((item) => item.status === "Ready now").length;
  const activeCount = demoShowcaseReadiness.filter((item) => item.status === "In progress").length;
  const readinessItems = demoShowcaseReadiness.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: item.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Demo Showcase Readiness", href: "/admin/demo-showcase-readiness" },
            ]}
          />
          <Eyebrow>Tomorrow demo</Eyebrow>
          <SectionHeading
            title="Demo showcase readiness"
            description="This page keeps the highest-priority walkthrough routes in one place so the next build slices stay focused on what friends and first observers will actually see."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked showcase lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{demoShowcaseReadiness.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{readyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Still polishing</p>
            <p className="mt-2 text-3xl font-semibold text-white">{activeCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="demo showcase lane"
            panelTitle="Write-through showcase action"
            panelDescription="Log showcase-route changes into the shared revision lane so walkthrough readiness stops living only as a static demo checklist."
            defaultRouteTarget="/admin/demo-showcase-readiness"
            defaultOperator="Demo Showcase Operator"
            defaultChangedFields="showcase_lane, route_priority, demo_state"
            actionNoun="demo-showcase mutation"
          />
          {demoShowcaseReadiness.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${tone(item.status)}`}>
                      {item.status}
                    </div>
                  </div>
                  <p className="max-w-4xl text-sm leading-7 text-mist/76">{item.summary}</p>
                  <div className="grid gap-3">
                    {item.checks.map((check) => (
                      <div
                        key={check}
                        className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
                      >
                        {check}
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open page
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
