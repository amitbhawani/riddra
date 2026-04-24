import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { RelationshipRevisionPanel } from "@/components/relationship-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { relationshipRules, relationshipSamples, taxonomySamples, taxonomySummary } from "@/lib/relationship-ops";

export const metadata: Metadata = {
  title: "Relationships",
  description: "Protected taxonomy and relationship console for clusters, related pages, and lifecycle linking.",
};

export default async function RelationshipsPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Relationships", href: "/admin/relationships" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Scale architecture</Eyebrow>
          <SectionHeading
            title="Taxonomy and relationships"
            description="This page turns the new taxonomy and relationship SQL layer into an operational surface for clusters, compare links, smart-search context, and lifecycle continuity."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Taxonomy types</p>
            <p className="mt-2 text-3xl font-semibold text-white">{taxonomySummary.taxonomyTypes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Mapped assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{taxonomySummary.mappedAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Relationship links</p>
            <p className="mt-2 text-3xl font-semibold text-white">{taxonomySummary.relationshipLinks}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Taxonomy samples</h2>
          <div className="mt-5 grid gap-4">
            {taxonomySamples.map((item) => (
              <div key={`${item.taxonomyType}-${item.slug}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.label}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.taxonomyType} · {item.slug}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    Taxonomy
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Relationship samples</h2>
          <div className="mt-5 grid gap-4">
            {relationshipSamples.map((item) => (
              <div key={`${item.source}-${item.target}-${item.relationshipType}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.relationshipType}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.source} → {item.target}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    Strength {item.strength}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Graph rules</h2>
          <div className="mt-5 grid gap-3">
            {relationshipRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <RelationshipRevisionPanel items={relationshipSamples} />
      </Container>
    </div>
  );
}
