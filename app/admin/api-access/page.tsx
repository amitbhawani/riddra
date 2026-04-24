import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { apiAccessItems } from "@/lib/api-access";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "API Access",
  description: "Protected API and provider access checklist for Phase 2 activation.",
};

export default async function ApiAccessPage() {
  await requireUser();

  const readinessItems = apiAccessItems.map((item) => ({
    label: item.name,
    status: item.priority === "Now" ? "Needs input" : item.priority === "Soon" ? "Queued" : "Planned",
    detail: `${item.category} · ${item.purpose} Collect: ${item.whatToCollect}`,
    routeTarget:
      item.name === "Supabase" || item.name === "Google Cloud OAuth"
        ? "/admin/auth-activation"
        : item.name === "Razorpay"
          ? "/admin/payment-readiness"
          : item.name === "Resend"
            ? "/admin/communication-readiness"
            : "/admin/api-access",
  }));

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "API Access", href: "/admin/api-access" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 activation</Eyebrow>
          <SectionHeading
            title="API and provider access"
            description="This page tracks the external services, logins, approvals, and credentials that should be collected in parallel while the build continues."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Now</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {apiAccessItems.filter((item) => item.priority === "Now").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Soon</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {apiAccessItems.filter((item) => item.priority === "Soon").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Later</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {apiAccessItems.filter((item) => item.priority === "Later").length}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="provider access requirement"
              panelTitle="Write-through API-access action"
              panelDescription="Log external-access changes into the shared revision lane so provider, auth, billing, and notification credential posture stop living only as a static collection checklist."
              defaultRouteTarget="/admin/api-access"
              defaultOperator="API Access Operator"
              defaultChangedFields="provider_access, credential_owner, collection_status"
              actionNoun="api-access mutation"
            />
          </div>
          {apiAccessItems.map((item) => (
            <GlowCard key={item.name}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">{item.name}</h2>
                <div className="flex gap-2 text-xs uppercase tracking-[0.18em]">
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.priority}</span>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.owner}</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  Category: <span className="text-white">{item.category}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  Purpose: <span className="text-white">{item.purpose}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  Collect: <span className="text-white">{item.whatToCollect}</span>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
