import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getDomainReadiness } from "@/lib/domain-readiness";

export const metadata: Metadata = {
  title: "Domain Readiness",
  description:
    "Protected domain-readiness page for launch-domain confidence, callback expectations, sitemap base, and trust alignment.",
};

export default async function AdminDomainReadinessPage() {
  await requireUser();

  const readiness = getDomainReadiness();
  const readinessItems = readiness.items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.detail,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Domain Readiness", href: "/admin/domain-readiness" },
            ]}
          />
          <Eyebrow>Domain confidence</Eyebrow>
          <SectionHeading
            title="Domain readiness"
            description="This page keeps the public-domain and callback side of launch honest so auth, sitemap, trust copy, and public messaging all point to the same real destination."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Current site URL</p>
            <p className="mt-2 text-xl font-semibold text-white break-all">{readiness.siteUrl}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{readiness.readyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{readiness.blockedCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="domain readiness check"
            panelTitle="Write-through domain action"
            panelDescription="Log domain and trust-surface changes into the shared revision lane so launch-domain posture stops living only as a static checklist."
            defaultRouteTarget="/admin/domain-readiness"
            defaultOperator="Domain Readiness Operator"
            defaultChangedFields="site_url, callback_expectation, trust_alignment"
            actionNoun="domain-readiness mutation"
          />
          {readiness.items.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
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
