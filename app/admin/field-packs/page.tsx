import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fieldPackItems, fieldPackRules, fieldPackSummary } from "@/lib/field-packs";

export const metadata: Metadata = {
  title: "Field Packs",
  description: "Protected field-packs page for reusable schema kits, validation bundles, and future operator-ready field expansion.",
};

export default async function AdminFieldPacksPage() {
  await requireUser();
  const readinessItems = fieldPackItems.map((item) => ({
    label: item.title,
    status: item.status === "Live" ? "Ready" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Identity and lifecycle pack"
        ? "/admin/content-models"
        : item.title === "Price and market metrics pack"
          ? "/admin/provider-configs"
          : item.title === "Editorial review pack"
            ? "/admin/revisions"
            : item.title === "Documents and announcements pack"
              ? "/admin/documents"
              : item.title === "Compare and relationship pack"
                ? "/admin/relationships"
                : item.title === "Campaign and CTA pack"
                  ? "/admin/campaign-engine"
                  : "/admin/support-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Field Packs", href: "/admin/field-packs" }]} />
          <Eyebrow>Reusable schema kits</Eyebrow>
          <SectionHeading
            title="Field packs"
            description="This page tracks reusable field bundles so new product families can inherit validated schema patterns instead of re-creating the same core structures every time."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Reusable packs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldPackSummary.reusablePacks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Validated families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldPackSummary.validatedFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued pack groups</p>
            <p className="mt-2 text-3xl font-semibold text-white">{fieldPackSummary.queuedPackGroups}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="field-pack family"
              panelTitle="Write-through field-pack action"
              panelDescription="Log reusable schema-pack changes into the shared revision lane so validation and pack-governance decisions stop living only as a static schema page."
              defaultRouteTarget="/admin/field-packs"
              defaultOperator="Field Pack Operator"
              defaultChangedFields="field_pack, validation_rule, pack_status"
              actionNoun="field-pack mutation"
            />
          </GlowCard>
          {fieldPackItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Field-pack rules</h2>
          <div className="mt-5 grid gap-3">
            {fieldPackRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
