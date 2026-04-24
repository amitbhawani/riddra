import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCallbackMatrix } from "@/lib/callback-matrix";

export const metadata: Metadata = {
  title: "Callback Matrix",
  description:
    "Protected callback-matrix page for exact auth, redirect, and provider callback values across local, production, and Supabase setup.",
};

export default async function AdminCallbackMatrixPage() {
  await requireUser();

  const matrix = getCallbackMatrix();
  const readinessItems = matrix.items.map((item) => ({
    label: item.label,
    status: item.status,
    detail: item.notes,
    routeTarget: "/admin/callback-matrix",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Callback Matrix", href: "/admin/callback-matrix" },
            ]}
          />
          <Eyebrow>Redirect readiness</Eyebrow>
          <SectionHeading
            title="Callback matrix"
            description="This page gives the team the exact redirect and callback values required during Supabase, Google, and domain setup so auth activation is less error-prone."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready values</p>
            <p className="mt-2 text-3xl font-semibold text-white">{matrix.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs confirmation</p>
            <p className="mt-2 text-3xl font-semibold text-white">{matrix.pending}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="callback matrix lane"
            panelTitle="Write-through callback readiness action"
            panelDescription="Log redirect, callback, and provider-origin changes into the shared revision lane so auth callback posture stops living only as a static redirect matrix."
            defaultRouteTarget="/admin/callback-matrix"
            defaultOperator="Callback Matrix Operator"
            defaultChangedFields="callback_url, redirect_origin, provider_mapping"
            actionNoun="callback-readiness mutation"
          />
          {matrix.items.map((item) => (
            <GlowCard key={item.label}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.label}</h2>
                  <p className="mt-3 break-all text-sm leading-7 text-white/88">{item.value}</p>
                  <p className="mt-3 text-sm leading-7 text-mist/72">{item.notes}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
