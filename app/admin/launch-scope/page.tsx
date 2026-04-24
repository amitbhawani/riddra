import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchScopeRevisionPanel } from "@/components/launch-scope-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { launchScopeItems, launchScopeRules, launchScopeSummary } from "@/lib/launch-scope";

export const metadata: Metadata = {
  title: "Launch Scope",
  description:
    "Protected launch-scope page for deciding what is public, gated, hidden, or roadmap-positioned at first release.",
};

export default async function AdminLaunchScopePage() {
  await requireUser();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Scope", href: "/admin/launch-scope" },
            ]}
          />
          <Eyebrow>Launch boundaries</Eyebrow>
          <SectionHeading
            title="Launch scope"
            description="This page keeps the first release honest by separating what is safe to make visible now from what should stay gated, hidden, or roadmap-positioned."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch visible</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchScopeSummary.launchVisible}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Gated or hidden</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchScopeSummary.gatedOrHidden}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{launchScopeSummary.reviewLanes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {launchScopeItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="grid gap-2 text-right">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.status}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.area}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Scope rules</h2>
          <div className="mt-5 grid gap-3">
            {launchScopeRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchScopeRevisionPanel items={launchScopeItems} />
      </Container>
    </div>
  );
}
