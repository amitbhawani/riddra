import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCredentialMatrix } from "@/lib/credential-matrix";

export const metadata: Metadata = {
  title: "Credential Matrix",
  description:
    "Protected credential-matrix page for exact env-key visibility across auth, launch mode, support, payments, email, and optional AI.",
};

export default async function AdminCredentialMatrixPage() {
  await requireUser();

  const matrix = getCredentialMatrix();
  const readinessItems = matrix.items.map((item) => ({
    label: item.key,
    status: item.status,
    detail: item.usedFor,
    routeTarget: "/admin/credential-matrix",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Credential Matrix", href: "/admin/credential-matrix" },
            ]}
          />
          <Eyebrow>Env inventory</Eyebrow>
          <SectionHeading
            title="Credential matrix"
            description="This page turns launch activation into an exact env checklist so the team knows which keys are present, which are missing, and what each one actually powers."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked keys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{matrix.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Present</p>
            <p className="mt-2 text-3xl font-semibold text-white">{matrix.present}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Missing</p>
            <p className="mt-2 text-3xl font-semibold text-white">{matrix.missing}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="credential matrix lane"
            panelTitle="Write-through credential readiness action"
            panelDescription="Log env-key and provider-secret changes into the shared revision lane so launch credential posture stops living only as a static inventory board."
            defaultRouteTarget="/admin/credential-matrix"
            defaultOperator="Credential Matrix Operator"
            defaultChangedFields="credential_key, credential_status, launch_dependency"
            actionNoun="credential-readiness mutation"
          />
          {matrix.items.map((item) => (
            <GlowCard key={item.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.key}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.usedFor}</p>
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
