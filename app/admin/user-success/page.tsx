import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { userSuccessItems, userSuccessRules, userSuccessSummary } from "@/lib/user-success";

export const metadata: Metadata = {
  title: "User Success",
  description:
    "Protected user-success page for activation follow-up, trust repair, subscriber retention, and guided support outcomes.",
};

export default async function AdminUserSuccessPage() {
  await requireUser();
  const readinessItems = userSuccessItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/user-success",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "User Success", href: "/admin/user-success" },
            ]}
          />
          <Eyebrow>Subscriber outcomes</Eyebrow>
          <SectionHeading
            title="User success"
            description="This page turns support, activation, and trust recovery into a user-success operating layer so subscribers are guided toward value instead of left to self-recover."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Success moments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{userSuccessSummary.successMoments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Intervention flows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{userSuccessSummary.interventionFlows}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Trust signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{userSuccessSummary.trustSignals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="user success lane"
            panelTitle="Write-through user-success action"
            panelDescription="Log activation follow-up, trust repair, and retention changes into the shared revision lane so subscriber success posture stops living only as a static outcomes board."
            defaultRouteTarget="/admin/user-success"
            defaultOperator="User Success Operator"
            defaultChangedFields="success_moment, intervention_flow, trust_signal"
            actionNoun="user-success mutation"
          />
          {userSuccessItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">User-success rules</h2>
          <div className="mt-5 grid gap-3">
            {userSuccessRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
