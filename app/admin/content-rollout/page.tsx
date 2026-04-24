import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentRolloutRevisionPanel } from "@/components/content-rollout-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { contentRolloutItems } from "@/lib/content-rollout";

export const metadata: Metadata = {
  title: "Content Rollout",
  description: "Protected content-rollout page for tracking route families, DB readiness, and fallback removal.",
};

export default async function ContentRolloutPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Content Rollout", href: "/admin/content-rollout" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 data rollout</Eyebrow>
          <SectionHeading
            title="Content rollout"
            description="This page maps each route family to its current data mode so we can deliberately move from fallback content into real database-backed publishing."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Fallback-first</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {contentRolloutItems.filter((item) => item.currentMode === "Fallback-first").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">DB-first with fallback</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {contentRolloutItems.filter((item) => item.currentMode === "DB-first with fallback").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">DB-ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {contentRolloutItems.filter((item) => item.currentMode === "DB-ready").length}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {contentRolloutItems.map((item) => (
            <GlowCard key={item.routeFamily}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">{item.routeFamily}</h2>
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  {item.currentMode}
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  Backing tables: <span className="text-white">{item.backingTables.join(", ")}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  Next step: <span className="text-white">{item.nextStep}</span>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <ContentRolloutRevisionPanel items={contentRolloutItems} />
      </Container>
    </div>
  );
}
