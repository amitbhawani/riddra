import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ContentModelRevisionPanel } from "@/components/content-model-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  contentModelEntities,
  contentModelExpansionQueue,
  contentModelRules,
} from "@/lib/content-model-registry";

export const metadata: Metadata = {
  title: "Content Models",
  description: "Protected content-model registry for scale-ready CMS entities, workflow states, and SQL planning.",
};

export default async function ContentModelsPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Content Models", href: "/admin/content-models" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Scale architecture</Eyebrow>
          <SectionHeading
            title="Content model registry"
            description="This page tracks the core CMS and SQL entities the platform should support before the number of public pages becomes too large for ad hoc structure."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Core entities</h2>
          <div className="mt-5 grid gap-4">
            {contentModelEntities.map((entity) => (
              <div key={entity.name} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{entity.title}</h3>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-mist/58">{entity.name}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {entity.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{entity.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Modeling rules</h2>
            <div className="mt-5 grid gap-3">
              {contentModelRules.map((rule) => (
                <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {rule}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Expansion queue</h2>
            <div className="mt-5 grid gap-3">
              {contentModelExpansionQueue.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <ContentModelRevisionPanel items={contentModelEntities} />
      </Container>
    </div>
  );
}
