import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getReferenceParityRegistrySummary, referenceParitySections } from "@/lib/reference-parity";

export const metadata: Metadata = {
  title: "Reference Parity",
  description:
    "Protected reference-parity page for tracking what charts, stocks, IPOs, funds, wealth pages, and learning still need before broad public launch.",
};

function statusTone(status: string) {
  if (status === "Partial") return "bg-flare/12 text-flare";
  if (status === "Seeded") return "bg-white/10 text-white";
  return "bg-bloom/12 text-bloom";
}

export default async function AdminReferenceParityPage() {
  await requireUser();

  const missingCount = referenceParitySections.filter((section) => section.status === "Missing depth").length;
  const partialCount = referenceParitySections.filter((section) => section.status === "Partial").length;
  const registrySummary = getReferenceParityRegistrySummary();
  const readinessItems = referenceParitySections.map((section) => ({
    label: section.title,
    status:
      section.status === "Partial"
        ? "Needs verification"
        : section.status === "Seeded"
          ? "Needs activation"
          : "Required",
    detail: section.currentState,
    routeTarget: section.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Reference Parity", href: "/admin/reference-parity" },
            ]}
          />
          <Eyebrow>Product depth audit</Eyebrow>
          <SectionHeading
            title="Reference parity"
            description="This page tracks where the product is still lighter than the stronger market platforms you shared. It keeps us honest about the difference between route coverage and real research or charting depth."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Reviewed clusters</p>
            <p className="mt-2 text-3xl font-semibold text-white">{referenceParitySections.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Missing depth</p>
            <p className="mt-2 text-3xl font-semibold text-white">{missingCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Partial</p>
            <p className="mt-2 text-3xl font-semibold text-white">{partialCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="reference parity cluster"
              panelTitle="Write-through reference-parity action"
              panelDescription="Log product-depth and parity changes into the shared revision lane so route-vs-depth gaps stop living only as comparison copy."
              defaultRouteTarget="/admin/reference-parity"
              defaultOperator="Reference Parity Operator"
              defaultChangedFields="parity_state, depth_gap, route_truth"
              actionNoun="reference-parity mutation"
            />
          </GlowCard>
          {referenceParitySections.map((section) => (
            <GlowCard key={section.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(section.status)}`}>
                      {section.status}
                    </div>
                  </div>
                  <p className="max-w-4xl text-sm leading-7 text-mist/74">{section.currentState}</p>
                </div>
                <Link
                  href={section.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open related surface
                </Link>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
                <div className="rounded-3xl border border-white/8 bg-black/15 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/58">Reference direction</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.references.map((reference) => (
                      <div key={reference} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                        {reference}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/8 bg-black/15 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/58">Must-have depth</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {section.mustHave.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-mist/76">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Reference parity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry turns the product-depth audit into a portable CSV across charts, stocks, funds, IPOs,
                wealth, screeners, and learning so the remaining parity gaps can be reviewed outside the page too.
              </p>
            </div>
            <Link
              href="/api/admin/reference-parity-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Partial</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.partial}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Seeded</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.seeded}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Missing depth</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.missingDepth}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
